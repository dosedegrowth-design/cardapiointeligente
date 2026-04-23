# Cardápio Inteligente — Regras & Lógica

> **Projeto Dose de Growth**
> Sistema de geração e gestão inteligente de cardápios semanais para creches (CEIs).
> Gera cardápio automaticamente a partir da referência da prefeitura, cruza com a lista de compras enviada por cada unidade e permite personalização por unidade.

---

## 1. Objetivo

Automatizar a criação semanal de cardápios nutricionalmente adequados para 3 faixas etárias (Berçário I 0–5m, Berçário I 6–11m, Berçário II / Multietário 1–4a) em múltiplas unidades de creche, minimizando trabalho manual da nutricionista e dando autonomia às unidades.

**Princípio central:** quanto menos toque humano manual, melhor. A IA gera → Super Admin revisa → Unidade personaliza → PDF pronto.

---

## 2. Arquitetura (diagrama textual)

```
┌──────────────────────────┐       ┌──────────────────────────┐
│  Biblioteca da Prefeitura│       │  Listas de Compras       │
│  (Canva PDFs por mês)    │       │  (enviadas por unidade)  │
└────────────┬─────────────┘       └────────────┬─────────────┘
             │                                   │
             └───────────────┬───────────────────┘
                             ▼
                ┌────────────────────────┐
                │  IA (Claude Sonnet 4.5)│
                │  Gerador + Validador   │
                │  + Substituidor        │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │  Cardápio Semanal      │
                │  (status: draft)       │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │  Super Admin revisa    │
                │  → Publica             │
                └────────────┬───────────┘
                             ▼
    ┌────────────────────────┴────────────────────────┐
    │                    PUBLICADO                     │
    └────────────────────────┬────────────────────────┘
                             │
                ┌────────────┴─────────────┐
                ▼                          ▼
    ┌────────────────────┐      ┌────────────────────┐
    │  Unidade A edita   │      │  Unidade B edita   │
    │  versão própria    │      │  versão própria    │
    └──────────┬─────────┘      └──────────┬─────────┘
               ▼                           ▼
    ┌────────────────────┐      ┌────────────────────┐
    │  PDF final A       │      │  PDF final B       │
    │  (logo + cor)      │      │  (logo + cor)      │
    └────────────────────┘      └────────────────────┘
```

---

## 3. Atores e Permissões

| Papel          | Permissões                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Super Admin**| CRUD total. Cria/edita unidades e usuários. Revisa e publica cardápios gerados pela IA. Acessa biblioteca. Vê tudo. |
| **Unidade**    | Vê cardápio publicado (read-only no padrão). Edita APENAS a sua versão. Envia lista de compras. Baixa PDF próprio.  |

RLS no Supabase:
- Super Admin (`role = 'super_admin'`): bypass RLS em tudo.
- Unidade (`role = 'unidade'`): só lê/escreve onde `unidade_id = auth.jwt().unidade_id`.

---

## 4. Regras de Negócio

### 4.1 Faixas etárias (**NÃO é igual à prefeitura**)
A prefeitura cobre até 6 anos. Este sistema usa apenas 3 faixas:
1. `bercario_1_0_5m` — Berçário I (0 a 5 meses) — só leite materno/fórmula 1
2. `bercario_1_6_11m` — Berçário I (6 a 11 meses) — fórmula 2 + introdução alimentar
3. `bercario_2_multi` — Berçário II / Multietário (1 a 4 anos) — alimentação completa

### 4.2 Estrutura do cardápio semanal
- 5 dias úteis (segunda–sexta)
- 5 refeições por dia: `desjejum`, `colacao`, `almoco`, `lanche`, `tarde`
- Dias especiais marcáveis: `atividade_suspensa` ou `feriado` (ocupa o dia todo)

### 4.3 Gate da lista de compras (regra crítica)
> Unidade só pode **editar** o cardápio da semana DEPOIS de enviar a lista de compras daquela semana.

Motivo: a lista de compras é o que define quais substituições inteligentes a IA fará pra aquela unidade.

### 4.4 Status do cardápio (máquina de estados)
```
draft ──► em_revisao ──► aprovado ──► publicado ──► arquivado
                  │             │
                  └── rejeitado ┘
```
- `draft`: IA gerou, aguardando Super Admin.
- `em_revisao`: Super Admin abriu.
- `aprovado`: Super Admin aprovou, ainda não publicou.
- `publicado`: visível para unidades (podem começar a personalizar).
- `arquivado`: semana passou.

Se `auto_publicar = true` no config global, o fluxo pula `em_revisao` e vai direto pra `publicado`.

### 4.5 Substituição automática (IA)
Quando a unidade envia lista de compras e algum item do cardápio padrão **não está na lista**, a IA substitui automaticamente por alternativa nutricionalmente equivalente.

Grupos de equivalência (base mínima):
- **Frutas**: maçã ≈ pera ≈ banana ≈ mamão ≈ laranja ≈ melão ≈ melancia
- **Proteínas**: frango ≈ peixe ≈ ovo ≈ carne moída
- **Carboidratos**: arroz ≈ macarrão ≈ batata ≈ inhame
- **Folhas/legumes**: alface ≈ repolho ≈ couve ≈ brócolis
- **Tubérculos**: batata ≈ mandioca ≈ inhame ≈ cará

Restrições automáticas por faixa etária:
- `0–5m`: SÓ leite materno ou fórmula 1
- `6–11m`: sem sal adicionado, sem açúcar, sem mel, texturas apropriadas
- `1–4a`: alimentação completa, mas sem frituras pesadas

Toda substituição é logada em `substituicoes_log` com motivo e confiança.

### 4.6 Geração automática semanal (cron)
Toda **sexta-feira 18:00**, a Edge Function `gerar-cardapio-semanal`:
1. Identifica a semana seguinte (seg–sex)
2. Busca na `biblioteca_prefeitura` o mês correspondente
3. Copia o cardápio-base para aquela semana
4. Para cada unidade que já enviou lista de compras:
   - Cruza cardápio × lista
   - IA substitui itens faltantes
   - Cria `cardapios_unidade` em status `draft`
5. Cria `cardapios_padrao` em status `draft` (com base genérica)
6. Notifica Super Admin

### 4.7 PDF final
- Gerado sob demanda quando unidade clica em "Baixar"
- Template HTML/CSS renderizado via Gotenberg
- Inclui: logo da unidade, nome da unidade, semana, 3 páginas (uma por faixa etária) OU só as faixas que a unidade atende
- A4 paisagem
- Histórico armazenado em `pdfs_gerados` (Supabase Storage)

---

## 5. Modelo de Dados

Schema: `cardapio` no Supabase.

```sql
-- Unidades (creches)
create table cardapio.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  logo_url text,
  cor_primaria text default '#FF8A65',
  faixas_atendidas text[] default array['bercario_1_0_5m','bercario_1_6_11m','bercario_2_multi'],
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Usuários (extends auth.users)
create table cardapio.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nome text,
  role text not null check (role in ('super_admin','unidade')),
  unidade_id uuid references cardapio.unidades(id),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Biblioteca de referências da prefeitura
create table cardapio.biblioteca_prefeitura (
  id uuid primary key default gen_random_uuid(),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  semana_inicio date not null,
  semana_fim date not null,
  fonte text default 'prefeitura',
  canva_url text,
  conteudo_extraido jsonb,  -- { faixa: { dia: { refeicao: "descricao" } } }
  extraido_em timestamptz,
  created_at timestamptz default now(),
  unique (ano, mes, semana_inicio)
);

-- Cardápio padrão da semana (gerado pela IA ou criado manual)
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

-- Células da grade (5 dias x 5 refeições)
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

-- Lista de compras da semana (por unidade)
create table cardapio.listas_compras (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references cardapio.unidades(id),
  semana_inicio date not null,
  itens jsonb not null default '[]',  -- [{ quantidade, unidade, item }]
  enviada_em timestamptz default now(),
  created_by uuid references cardapio.usuarios(id),
  unique (unidade_id, semana_inicio)
);

-- Cardápio personalizado da unidade
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

-- Sobrescritas de células (só o que foi editado pela unidade)
create table cardapio.cardapio_unidade_refeicoes (
  id uuid primary key default gen_random_uuid(),
  cardapio_unidade_id uuid not null references cardapio.cardapios_unidade(id) on delete cascade,
  dia int not null,
  refeicao text not null,
  descricao text,
  edited_at timestamptz default now(),
  unique (cardapio_unidade_id, dia, refeicao)
);

-- Log de substituições feitas pela IA
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

-- Histórico de PDFs gerados
create table cardapio.pdfs_gerados (
  id uuid primary key default gen_random_uuid(),
  cardapio_unidade_id uuid references cardapio.cardapios_unidade(id),
  faixa_etaria text,
  pdf_url text,
  gerado_em timestamptz default now(),
  gerado_por uuid references cardapio.usuarios(id)
);

-- Configurações globais
create table cardapio.config (
  chave text primary key,
  valor jsonb
);
```

---

## 6. Fluxos End-to-End

### 6.1 Geração automática (feliz)
1. Sexta 18h — cron dispara `gerar-cardapio-semanal`
2. Busca referência do mês na biblioteca
3. Gera 3 cardápios padrão (status `draft`)
4. Para cada unidade com lista enviada, gera versão personalizada
5. Notifica Super Admin (email/WhatsApp)
6. Segunda — Super Admin revisa, ajusta, clica Publicar
7. Unidades recebem notificação
8. Unidade abre, faz ajustes se quiser, baixa PDF

### 6.2 Unidade nova no sistema
1. Super Admin cria unidade + usuário
2. Usuário recebe email com link de setup de senha
3. Faz login, vê dashboard vazio
4. Ao enviar primeira lista de compras, sistema puxa o cardápio padrão da semana atual e gera versão personalizada

### 6.3 Sem lista de compras enviada
- Unidade vê o cardápio padrão em read-only
- Banner: "Envie a lista de compras da semana para personalizar e baixar o PDF"
- Não consegue editar nem baixar até enviar

---

## 7. Decisões Técnicas

| Decisão                  | Escolha                        | Motivo                                                      |
| ------------------------ | ------------------------------ | ----------------------------------------------------------- |
| Framework                | Next.js 14 App Router          | SSR, rotas API simples, integração Vercel                   |
| Styling                  | Tailwind + shadcn/ui           | Velocidade + consistência visual                            |
| Animação                 | Framer Motion                  | Microinterações lúdicas pedidas pelo Lucas                  |
| DB                       | Supabase Postgres              | RLS, Auth, Edge Functions, Storage — tudo integrado         |
| IA                       | Claude Sonnet 4.5 (Anthropic)  | Melhor custo/qualidade pra geração de cardápios             |
| PDF                      | Gotenberg + HTML/CSS           | Template flexível (mesma stack do LNB)                      |
| Cron                     | Supabase pg_cron               | Zero infra adicional                                        |
| Auth                     | Supabase Auth (magic link)     | Simples pras diretoras/gestoras                             |
| Schema                   | `cardapio` (não `public`)      | Isolamento — precisa expor em `db_schemas` do PostgREST     |

---

## 8. Gotchas / Armadilhas

- **Schema `cardapio` precisa ser exposto no PostgREST:**
  ```sql
  alter role authenticator set pgrst.db_schemas = 'public,graphql_public,cardapio';
  notify pgrst, 'reload schema';
  ```
- **RLS tem que cobrir TODAS as tabelas** — se esquecer numa, vaza dados entre unidades.
- **Lista de compras é JSONB** — não criar tabela filha, fica mais flexível pro parser de texto livre aceitar formatos variados.
- **Feriados/atividade suspensa** — tratar como tipo especial de célula, não como ausência de dado.
- **Cardápio padrão vs unidade** — unidade NUNCA escreve em `cardapios_padrao`. Só em `cardapios_unidade` + `cardapio_unidade_refeicoes`.
- **Sobrescritas parciais** — o PDF final busca primeiro em `cardapio_unidade_refeicoes`, e só cai pro `cardapio_refeicoes` (padrão) se não tiver override.
- **IDs de semana** — usar sempre a **data de segunda-feira** como chave lógica (`semana_inicio`). Nunca usar número da semana (ISO week) porque dá problema em dezembro/janeiro.

---

## 9. Como rodar localmente

```bash
# 1. Clonar repo
git clone git@github.com:dosedegrowth-design/cardapio-inteligente.git
cd cardapio-inteligente

# 2. Instalar deps
pnpm install

# 3. Variáveis de ambiente
cp .env.example .env.local
# Preencher:
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=
#   ANTHROPIC_API_KEY=
#   GOTENBERG_URL=

# 4. Rodar migrations no Supabase
#   (via dashboard SQL Editor ou Supabase CLI)

# 5. Rodar dev server
pnpm dev
```

### Deploy
```bash
# Vercel (automático via GitHub)
vercel --prod

# Edge Functions Supabase
supabase functions deploy gerar-cardapio-semanal
supabase functions deploy gerar-pdf
```

---

## 10. Manutenção — Tarefas Comuns

### Adicionar nova unidade
1. `/admin/unidades` → "Nova Unidade"
2. Preencher nome, slug, logo, cor
3. Criar usuário vinculado em `/admin/usuarios`
4. Usuário recebe email → define senha → pronto

### Adicionar nova faixa etária
1. Atualizar CHECK constraint em `cardapio_padrao.faixa_etaria`
2. Atualizar enum no frontend (`lib/constants.ts`)
3. Atualizar template PDF

### Alterar referência da prefeitura
1. `/admin/referencias/prefeitura` → Nova referência
2. Subir PDF ou colar URL Canva
3. IA extrai → salvo em `biblioteca_prefeitura`

### Resetar cardápio de uma semana
1. `/admin/semanas/[semana]` → "Regerar com IA"
2. Confirma overwrite
3. Mantém edições de unidades (opcional: flag "também resetar unidades")

---

## 11. Changelog

- **v0.1 (2026-04-22)** — Documentação inicial e plano aprovado.

---

**Mantenedor:** Lucas Cassiano (Dose de Growth)
**Aplicação:** Rede de CEIs (creches)
