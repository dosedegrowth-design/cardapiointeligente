# 🚀 Setup do Cardápio Inteligente

Guia passo-a-passo pra subir o projeto do zero em produção.

---

## 1. Criar projeto Supabase

1. Acesse https://supabase.com/dashboard
2. "New project" → nome: `cardapio-inteligente`
3. Copie as chaves de `Project Settings > API`:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (NUNCA expor no frontend)

## 2. Rodar as migrations

No **SQL Editor** do Supabase, rode em ordem:

1. `supabase/migrations/20260422000001_initial_schema.sql`
2. `supabase/migrations/20260422000002_seed_data.sql`

Verifique em `Database > Tables` que o schema `cardapio` foi criado com todas as tabelas.

## 3. Criar usuário Super Admin

No **Authentication > Users** do Supabase, clique "Add user" e:
- Email: `seu-email@dosedegrowth.com.br`
- Auto-confirm: ✅

Depois no **SQL Editor**:

```sql
insert into cardapio.usuarios (id, email, nome, role)
values (
  (select id from auth.users where email = 'seu-email@dosedegrowth.com.br'),
  'seu-email@dosedegrowth.com.br',
  'Seu Nome',
  'super_admin'
);
```

## 4. Criar usuários de unidade

```sql
-- Primeiro cria no Auth (Add user) com email da unidade
-- Depois:
insert into cardapio.usuarios (id, email, nome, role, unidade_id)
values (
  (select id from auth.users where email = 'futuro@creche.com.br'),
  'futuro@creche.com.br',
  'Diretora Futuro',
  'unidade',
  (select id from cardapio.unidades where slug = 'futuro')
);
```

## 5. Obter chave Anthropic

1. https://console.anthropic.com/settings/keys
2. Create Key
3. Cole em `ANTHROPIC_API_KEY`

## 6. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Preencher todas as variáveis
```

## 7. Rodar localmente

```bash
npm install
npm run dev
# http://localhost:3000
```

## 8. Deploy Vercel

```bash
# Instalar Vercel CLI se necessário
npm i -g vercel

# Login + deploy
vercel login
vercel --prod
```

Configure as mesmas env vars no dashboard da Vercel.

## 9. (Opcional) Gotenberg para PDFs

Rode o Gotenberg via Docker:
```bash
docker run --rm -p 3001:3000 gotenberg/gotenberg:8
```

E defina `GOTENBERG_URL=http://localhost:3001` (ou use um host público em produção).

## 10. Cron semanal (opcional)

No Supabase **Database > Cron**, crie um job:
- Nome: `gerar-cardapio-semanal`
- Schedule: `0 18 * * 5` (toda sexta 18h)
- Command:
  ```sql
  select net.http_post(
    url := 'https://SEU_DOMAIN/api/cron/gerar-cardapio',
    headers := '{"Authorization": "Bearer SEU_CRON_TOKEN"}'::jsonb
  );
  ```

---

## Troubleshooting

**Schema `cardapio` não aparece no Supabase JS:**
```sql
alter role authenticator set pgrst.db_schemas = 'public,graphql_public,cardapio';
notify pgrst, 'reload schema';
```

**Erro 401/403 no PostgREST:**
Verifique que RLS foi habilitado e que o usuário tem registro em `cardapio.usuarios` com `role` correto.
