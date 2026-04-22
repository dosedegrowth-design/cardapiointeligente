# 🍽️ Cardápio Inteligente

Sistema de geração automática e gestão de cardápios semanais para creches (CEIs).

## O que faz
- **IA gera** cardápios semanais automaticamente baseado na referência da prefeitura
- Cada **unidade personaliza** seu cardápio conforme a lista de compras da semana
- **Substituição inteligente** de itens (se faltou maçã, IA troca por pera)
- **PDF final** bonito com identidade da unidade
- **Multi-tenant** com permissões por unidade (Super Admin + Unidade)

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Supabase (Postgres + Auth + Edge Functions + Storage)
- Claude Sonnet 4.5 (geração de cardápios)
- Gotenberg (PDF)
- Vercel (deploy)

## Documentação completa
Veja [`REGRAS_E_LOGICA.md`](./REGRAS_E_LOGICA.md) para arquitetura, regras de negócio, modelo de dados, fluxos end-to-end, decisões técnicas e guia de manutenção.

## Rodar localmente
```bash
pnpm install
cp .env.example .env.local  # preencher as variáveis
pnpm dev
```
