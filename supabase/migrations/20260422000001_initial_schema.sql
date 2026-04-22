-- =============================================================================
-- Cardápio Inteligente — Schema Inicial
-- =============================================================================

create schema if not exists cardapio;

-- Expor schema no PostgREST (necessário pro Supabase JS client acessar)
alter role authenticator set pgrst.db_schemas = 'public,graphql_public,cardapio';
notify pgrst, 'reload schema';

-- =============================================================================
-- TABELAS
-- =============================================================================

create table cardapio.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  logo_url text,
  cor_primaria text default '#E07A5F',
  faixas_atendidas text[] default array['bercario_1_0_5m','bercario_1_6_11m','bercario_2_multi'],
  ativo boolean default true,
  created_at timestamptz default now()
);

create table cardapio.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nome text,
  role text not null check (role in ('super_admin','unidade')),
  unidade_id uuid references cardapio.unidades(id),
  ativo boolean default true,
  created_at timestamptz default now()
);

create table cardapio.biblioteca_prefeitura (
  id uuid primary key default gen_random_uuid(),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  semana_inicio date not null,
  semana_fim date not null,
  fonte text default 'prefeitura',
  canva_url text,
  conteudo_extraido jsonb,
  extraido_em timestamptz,
  created_at timestamptz default now(),
  unique (ano, mes, semana_inicio)
);

create table cardapio.cardapios_padrao (
  id uuid primary key default gen_random_uuid(),
  semana_inicio date not null,
  semana_fim date not null,
  faixa_etaria text not null check (faixa_etaria in ('bercario_1_0_5m','bercario_1_6_11m','bercario_2_multi')),
  status text not null default 'draft' check (status in ('draft','em_revisao','aprovado','publicado','arquivado')),
  gerado_por text default 'manual' check (gerado_por in ('ia','manual')),
  auto_publicar boolean default false,
  referencia_prefeitura_id uuid references cardapio.biblioteca_prefeitura(id),
  created_by uuid references cardapio.usuarios(id),
  aprovado_por uuid references cardapio.usuarios(id),
  publicado_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (semana_inicio, faixa_etaria)
);

create table cardapio.cardapio_refeicoes (
  id uuid primary key default gen_random_uuid(),
  cardapio_id uuid not null references cardapio.cardapios_padrao(id) on delete cascade,
  dia int not null check (dia between 1 and 5),
  refeicao text not null check (refeicao in ('desjejum','colacao','almoco','lanche','tarde')),
  descricao text,
  especial text check (especial in ('atividade_suspensa','feriado')),
  feriado_nome text,
  unique (cardapio_id, dia, refeicao)
);

create table cardapio.listas_compras (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references cardapio.unidades(id),
  semana_inicio date not null,
  itens jsonb not null default '[]',
  enviada_em timestamptz default now(),
  created_by uuid references cardapio.usuarios(id),
  unique (unidade_id, semana_inicio)
);

create table cardapio.cardapios_unidade (
  id uuid primary key default gen_random_uuid(),
  cardapio_padrao_id uuid not null references cardapio.cardapios_padrao(id),
  unidade_id uuid not null references cardapio.unidades(id),
  lista_compras_id uuid references cardapio.listas_compras(id),
  finalizado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cardapio_padrao_id, unidade_id)
);

create table cardapio.cardapio_unidade_refeicoes (
  id uuid primary key default gen_random_uuid(),
  cardapio_unidade_id uuid not null references cardapio.cardapios_unidade(id) on delete cascade,
  dia int not null,
  refeicao text not null,
  descricao text,
  edited_at timestamptz default now(),
  unique (cardapio_unidade_id, dia, refeicao)
);

create table cardapio.substituicoes_log (
  id uuid primary key default gen_random_uuid(),
  cardapio_unidade_id uuid references cardapio.cardapios_unidade(id),
  dia int,
  refeicao text,
  item_original text,
  item_substituto text,
  motivo text,
  confianca numeric,
  created_at timestamptz default now()
);

create table cardapio.pdfs_gerados (
  id uuid primary key default gen_random_uuid(),
  cardapio_unidade_id uuid references cardapio.cardapios_unidade(id),
  faixa_etaria text,
  pdf_url text,
  gerado_em timestamptz default now(),
  gerado_por uuid references cardapio.usuarios(id)
);

create table cardapio.config (
  chave text primary key,
  valor jsonb
);

-- Configs iniciais
insert into cardapio.config (chave, valor) values
  ('auto_publicar_global', 'false'::jsonb),
  ('cron_geracao_ativo', 'false'::jsonb),
  ('cron_geracao_dia_semana', '5'::jsonb),   -- sexta
  ('cron_geracao_hora', '18'::jsonb);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_cardapios_padrao_semana on cardapio.cardapios_padrao (semana_inicio);
create index idx_cardapios_padrao_status on cardapio.cardapios_padrao (status);
create index idx_cardapio_refeicoes_cardapio on cardapio.cardapio_refeicoes (cardapio_id);
create index idx_cardapios_unidade_unidade on cardapio.cardapios_unidade (unidade_id);
create index idx_listas_compras_unidade on cardapio.listas_compras (unidade_id, semana_inicio);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

create or replace function cardapio.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_cardapios_padrao_updated_at
  before update on cardapio.cardapios_padrao
  for each row execute function cardapio.set_updated_at();

create trigger trg_cardapios_unidade_updated_at
  before update on cardapio.cardapios_unidade
  for each row execute function cardapio.set_updated_at();

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

alter table cardapio.unidades enable row level security;
alter table cardapio.usuarios enable row level security;
alter table cardapio.biblioteca_prefeitura enable row level security;
alter table cardapio.cardapios_padrao enable row level security;
alter table cardapio.cardapio_refeicoes enable row level security;
alter table cardapio.listas_compras enable row level security;
alter table cardapio.cardapios_unidade enable row level security;
alter table cardapio.cardapio_unidade_refeicoes enable row level security;
alter table cardapio.substituicoes_log enable row level security;
alter table cardapio.pdfs_gerados enable row level security;
alter table cardapio.config enable row level security;

-- Helper: retorna role do usuário atual
create or replace function cardapio.current_role()
returns text as $$
  select role from cardapio.usuarios where id = auth.uid() limit 1;
$$ language sql stable security definer;

-- Helper: retorna unidade_id do usuário atual
create or replace function cardapio.current_unidade()
returns uuid as $$
  select unidade_id from cardapio.usuarios where id = auth.uid() limit 1;
$$ language sql stable security definer;

-- POLÍTICAS

-- unidades: super_admin CRUD; unidade SELECT só a própria
create policy "unidades_super_admin" on cardapio.unidades for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "unidades_unidade_select" on cardapio.unidades for select
  using (id = cardapio.current_unidade());

-- usuarios: super_admin CRUD; usuário vê só o próprio
create policy "usuarios_super_admin" on cardapio.usuarios for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "usuarios_self" on cardapio.usuarios for select
  using (id = auth.uid());

-- biblioteca_prefeitura: só super_admin
create policy "biblioteca_super_admin" on cardapio.biblioteca_prefeitura for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

-- cardapios_padrao: super_admin CRUD; unidade SELECT só publicados
create policy "cardapios_padrao_super_admin" on cardapio.cardapios_padrao for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "cardapios_padrao_unidade_select" on cardapio.cardapios_padrao for select
  using (status = 'publicado' and cardapio.current_role() = 'unidade');

-- cardapio_refeicoes: herda de cardapios_padrao
create policy "cardapio_refeicoes_super_admin" on cardapio.cardapio_refeicoes for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "cardapio_refeicoes_unidade_select" on cardapio.cardapio_refeicoes for select
  using (exists (
    select 1 from cardapio.cardapios_padrao cp
    where cp.id = cardapio_id and cp.status = 'publicado'
  ));

-- listas_compras: super_admin CRUD; unidade CRUD só na própria
create policy "listas_compras_super_admin" on cardapio.listas_compras for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "listas_compras_unidade" on cardapio.listas_compras for all
  using (unidade_id = cardapio.current_unidade())
  with check (unidade_id = cardapio.current_unidade());

-- cardapios_unidade: super_admin CRUD; unidade CRUD só na própria
create policy "cardapios_unidade_super_admin" on cardapio.cardapios_unidade for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "cardapios_unidade_unidade" on cardapio.cardapios_unidade for all
  using (unidade_id = cardapio.current_unidade())
  with check (unidade_id = cardapio.current_unidade());

-- cardapio_unidade_refeicoes: herda de cardapios_unidade
create policy "cardapio_unidade_refeicoes_super_admin" on cardapio.cardapio_unidade_refeicoes for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "cardapio_unidade_refeicoes_unidade" on cardapio.cardapio_unidade_refeicoes for all
  using (exists (
    select 1 from cardapio.cardapios_unidade cu
    where cu.id = cardapio_unidade_id and cu.unidade_id = cardapio.current_unidade()
  ))
  with check (exists (
    select 1 from cardapio.cardapios_unidade cu
    where cu.id = cardapio_unidade_id and cu.unidade_id = cardapio.current_unidade()
  ));

-- substituicoes_log: super_admin vê tudo; unidade vê os logs do próprio cardápio
create policy "substituicoes_log_super_admin" on cardapio.substituicoes_log for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "substituicoes_log_unidade" on cardapio.substituicoes_log for select
  using (exists (
    select 1 from cardapio.cardapios_unidade cu
    where cu.id = cardapio_unidade_id and cu.unidade_id = cardapio.current_unidade()
  ));

-- pdfs_gerados: igual
create policy "pdfs_super_admin" on cardapio.pdfs_gerados for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

create policy "pdfs_unidade" on cardapio.pdfs_gerados for all
  using (exists (
    select 1 from cardapio.cardapios_unidade cu
    where cu.id = cardapio_unidade_id and cu.unidade_id = cardapio.current_unidade()
  ))
  with check (exists (
    select 1 from cardapio.cardapios_unidade cu
    where cu.id = cardapio_unidade_id and cu.unidade_id = cardapio.current_unidade()
  ));

-- config: só super_admin
create policy "config_super_admin" on cardapio.config for all
  using (cardapio.current_role() = 'super_admin')
  with check (cardapio.current_role() = 'super_admin');

-- Permite todos usuários autenticados SELECT na config (frontend precisa ler flags)
create policy "config_read_authenticated" on cardapio.config for select
  using (auth.uid() is not null);

-- =============================================================================
-- GRANTS
-- =============================================================================

grant usage on schema cardapio to anon, authenticated;
grant all on all tables in schema cardapio to authenticated;
grant all on all sequences in schema cardapio to authenticated;
grant all on all functions in schema cardapio to authenticated;
