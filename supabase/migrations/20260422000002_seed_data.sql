-- =============================================================================
-- Seed de dados iniciais
-- =============================================================================

-- Unidades (as 5 identificadas nas listas de compras do Lucas)
insert into cardapio.unidades (nome, slug, cor_primaria) values
  ('CEI Futuro do Amanhã', 'futuro', '#E07A5F'),
  ('CEI Nakine', 'nakine', '#81B29A'),
  ('CEI Apolinário', 'apolinario', '#F2CC8F'),
  ('CEI Maurício', 'mauricio', '#BFDDE6'),
  ('CEI Elisa', 'elisa', '#E0C8F5')
on conflict (slug) do nothing;

-- Cardápio padrão demo: semana 20-24/04/2026 (baseado no PDF de referência)
-- Berçário I 0-5m
with c as (
  insert into cardapio.cardapios_padrao (semana_inicio, semana_fim, faixa_etaria, status, gerado_por)
  values ('2026-04-20', '2026-04-24', 'bercario_1_0_5m', 'publicado', 'manual')
  returning id
)
insert into cardapio.cardapio_refeicoes (cardapio_id, dia, refeicao, descricao, especial, feriado_nome)
select c.id, d, r, desc_, esp, fer from c, (values
  -- Segunda (dia 1) - atividade suspensa
  (1, 'almoco', null, 'atividade_suspensa', null),
  -- Terça (dia 2) - feriado
  (2, 'almoco', null, 'feriado', 'Feriado de Tiradentes'),
  -- Quarta (dia 3)
  (3, 'desjejum', 'Leite materno ou fórmula infantil 1', null, null),
  (3, 'colacao', 'Leite materno ou fórmula infantil 1', null, null),
  (3, 'almoco', 'Leite materno ou fórmula infantil 1', null, null),
  (3, 'lanche', 'Leite materno ou fórmula infantil 1', null, null),
  (3, 'tarde', 'Leite materno ou fórmula infantil 1', null, null),
  -- Quinta (dia 4)
  (4, 'desjejum', 'Leite materno ou fórmula infantil 1', null, null),
  (4, 'colacao', 'Leite materno ou fórmula infantil 1', null, null),
  (4, 'almoco', 'Leite materno ou fórmula infantil 1', null, null),
  (4, 'lanche', 'Leite materno ou fórmula infantil 1', null, null),
  (4, 'tarde', 'Leite materno ou fórmula infantil 1', null, null),
  -- Sexta (dia 5)
  (5, 'desjejum', 'Leite materno ou fórmula infantil 1', null, null),
  (5, 'colacao', 'Leite materno ou fórmula infantil 1', null, null),
  (5, 'almoco', 'Leite materno ou fórmula infantil 1', null, null),
  (5, 'lanche', 'Leite materno ou fórmula infantil 1', null, null),
  (5, 'tarde', 'Leite materno ou fórmula infantil 1', null, null)
) as v(d, r, desc_, esp, fer);

-- Berçário I 6-11m
with c as (
  insert into cardapio.cardapios_padrao (semana_inicio, semana_fim, faixa_etaria, status, gerado_por)
  values ('2026-04-20', '2026-04-24', 'bercario_1_6_11m', 'publicado', 'manual')
  returning id
)
insert into cardapio.cardapio_refeicoes (cardapio_id, dia, refeicao, descricao, especial, feriado_nome)
select c.id, d, r, desc_, esp, fer from c, (values
  (1, 'almoco', null, 'atividade_suspensa', null),
  (2, 'almoco', null, 'feriado', 'Feriado de Tiradentes'),
  (3, 'desjejum', 'Leite materno ou fórmula infantil 2 + mamão', null, null),
  (3, 'colacao', 'Laranja', null, null),
  (3, 'almoco', 'Arroz, feijão carioca, ovo mexido, repolho refogado + melancia', null, null),
  (3, 'lanche', 'Leite materno ou fórmula infantil 2', null, null),
  (3, 'tarde', 'Leite materno ou fórmula infantil 2 + banana', null, null),
  (4, 'desjejum', 'Leite materno ou fórmula infantil 2 + maçã', null, null),
  (4, 'colacao', 'Mamão', null, null),
  (4, 'almoco', 'Macarrão ao molho, frango em cubos, brócolis refogado, melão', null, null),
  (4, 'lanche', 'Leite materno ou fórmula infantil 2', null, null),
  (4, 'tarde', 'Leite materno ou fórmula infantil 2 + laranja', null, null),
  (5, 'desjejum', 'Leite materno ou fórmula infantil 2 + banana', null, null),
  (5, 'colacao', 'Maçã', null, null),
  (5, 'almoco', 'Arroz, feijão carioca, peixe cozido + purê de batata + salada de fruta', null, null),
  (5, 'lanche', 'Leite materno ou fórmula infantil 2', null, null),
  (5, 'tarde', 'Leite materno ou fórmula infantil 2 + melão', null, null)
) as v(d, r, desc_, esp, fer);

-- Berçário II / Multietário (1-4 anos)
with c as (
  insert into cardapio.cardapios_padrao (semana_inicio, semana_fim, faixa_etaria, status, gerado_por)
  values ('2026-04-20', '2026-04-24', 'bercario_2_multi', 'publicado', 'manual')
  returning id
)
insert into cardapio.cardapio_refeicoes (cardapio_id, dia, refeicao, descricao, especial, feriado_nome)
select c.id, d, r, desc_, esp, fer from c, (values
  (1, 'almoco', null, 'atividade_suspensa', null),
  (2, 'almoco', null, 'feriado', 'Feriado de Tiradentes'),
  (3, 'desjejum', 'Leite integral + biscoito de polvilho + mamão', null, null),
  (3, 'colacao', 'Laranja', null, null),
  (3, 'almoco', 'Arroz, feijão carioca, ovo mexido, repolho refogado + melancia', null, null),
  (3, 'lanche', 'Leite integral batido c/ maçã', null, null),
  (3, 'tarde', 'Sopa: macarrão de sopa + grão de bico + cenoura + inhame + banana', null, null),
  (4, 'desjejum', 'Leite integral batido c/ maçã + pão caseiro com requeijão', null, null),
  (4, 'colacao', 'Mamão', null, null),
  (4, 'almoco', 'Macarrão ao molho, frango em cubos, brócolis refogado, melão', null, null),
  (4, 'lanche', 'Leite integral c/ cacau', null, null),
  (4, 'tarde', 'Risoto: arroz + carne moída + abóbora + chuchu + laranja', null, null),
  (5, 'desjejum', 'Leite integral c/ cacau + bolo de fubá + banana', null, null),
  (5, 'colacao', 'Maçã', null, null),
  (5, 'almoco', 'Arroz, feijão carioca, peixe cozido + purê de batata + salada de fruta', null, null),
  (5, 'lanche', 'Leite integral batido c/ mamão', null, null),
  (5, 'tarde', 'Sopa: macarrão de sopa + ervilha + cenoura + batata + banana', null, null)
) as v(d, r, desc_, esp, fer);

-- Biblioteca de referência Canva (links enviados pelo Lucas)
insert into cardapio.biblioteca_prefeitura (ano, mes, semana_inicio, semana_fim, canva_url, fonte) values
  (2025, 1, '2025-01-06', '2025-01-10', 'https://www.canva.com/design/DAGcXdK3pBA/vGlgUR5FAd0MyyDhz-3IvA/view', 'prefeitura'),
  (2025, 2, '2025-02-03', '2025-02-07', 'https://www.canva.com/design/DAGeuNzHGzk/h2OMw9_fyUZNOh6Ghyfixw/view', 'prefeitura'),
  (2025, 3, '2025-03-03', '2025-03-07', 'https://www.canva.com/design/DAGgBnywpLI/HbwIDXBS7djQoIKErOJlVw/view', 'prefeitura'),
  (2025, 4, '2025-04-07', '2025-04-11', 'https://www.canva.com/design/DAGiMtl7cn4/KQH8EQr0QRhOD4OoxgerVg/view', 'prefeitura'),
  (2025, 5, '2025-05-05', '2025-05-09', 'https://www.canva.com/design/DAGmm18nd6s/M0Y4p9L4J1cT5VCXNdp7NQ/view', 'prefeitura'),
  (2025, 6, '2025-06-02', '2025-06-06', 'https://www.canva.com/design/DAGnoqXs7_4/KD6tZwGu-nhy7cbHUAM-3Q/view', 'prefeitura'),
  (2025, 7, '2025-07-07', '2025-07-11', 'https://www.canva.com/design/DAGnoq01qlw/0tK0koEzKQfTNdLokJomWg/view', 'prefeitura'),
  (2025, 8, '2025-08-04', '2025-08-08', 'https://www.canva.com/design/DAGnokZB2sM/3zWeRrsxPWT4_flCymt-gg/view', 'prefeitura'),
  (2025, 9, '2025-09-01', '2025-09-05', 'https://www.canva.com/design/DAGnopk6K_I/iZkYFCnY5cLJnX9Mk04pfg/view', 'prefeitura'),
  (2025, 10, '2025-10-06', '2025-10-10', 'https://www.canva.com/design/DAGnol_8z2M/8EwRfysP-tD_T3Ges8NBtQ/view', 'prefeitura'),
  (2025, 11, '2025-11-03', '2025-11-07', 'https://www.canva.com/design/DAGnosEZI-0/Z1VFOVgFX_aLrLIuXktyYw/view', 'prefeitura')
on conflict (ano, mes, semana_inicio) do nothing;
