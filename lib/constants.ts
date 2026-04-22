export const FAIXAS_ETARIAS = [
  {
    id: "bercario_1_0_5m",
    nome: "Berçário I",
    idade: "0 a 5 meses",
    cor: "pastel-sky",
    descricao: "Leite materno ou fórmula infantil 1.",
  },
  {
    id: "bercario_1_6_11m",
    nome: "Berçário I",
    idade: "6 a 11 meses",
    cor: "pastel-mint",
    descricao: "Fórmula 2 + introdução alimentar.",
  },
  {
    id: "bercario_2_multi",
    nome: "Berçário II / Multietário",
    idade: "1 a 4 anos",
    cor: "pastel-peach",
    descricao: "Alimentação completa.",
  },
] as const;

export type FaixaEtariaId = (typeof FAIXAS_ETARIAS)[number]["id"];

export const DIAS_SEMANA = [
  { id: 1, nome: "Segunda", abrev: "Seg" },
  { id: 2, nome: "Terça", abrev: "Ter" },
  { id: 3, nome: "Quarta", abrev: "Qua" },
  { id: 4, nome: "Quinta", abrev: "Qui" },
  { id: 5, nome: "Sexta", abrev: "Sex" },
] as const;

export const REFEICOES = [
  { id: "desjejum", nome: "Desjejum", cor: "pastel-rose", horario: "~7h" },
  { id: "colacao", nome: "Colação", cor: "pastel-butter", horario: "~9h30" },
  { id: "almoco", nome: "Almoço", cor: "pastel-mint", horario: "~11h30" },
  { id: "lanche", nome: "Lanche", cor: "pastel-peach", horario: "~14h30" },
  { id: "tarde", nome: "Refeição da tarde", cor: "pastel-lavender", horario: "~16h" },
] as const;

export type RefeicaoId = (typeof REFEICOES)[number]["id"];

export const STATUS_CARDAPIO = [
  { id: "draft", nome: "Rascunho", cor: "zinc" },
  { id: "em_revisao", nome: "Em revisão", cor: "amber" },
  { id: "aprovado", nome: "Aprovado", cor: "sky" },
  { id: "publicado", nome: "Publicado", cor: "emerald" },
  { id: "arquivado", nome: "Arquivado", cor: "zinc" },
] as const;

/** Grupos de equivalência nutricional usados pela IA */
export const GRUPOS_EQUIVALENCIA = {
  frutas: ["maçã", "pera", "banana", "mamão", "laranja", "melão", "melancia", "manga"],
  proteinas: ["frango", "peixe", "ovo", "carne moída", "carne bovina"],
  carboidratos: ["arroz", "macarrão", "batata", "inhame", "mandioca"],
  folhas: ["alface", "repolho", "couve", "brócolis"],
  legumes: ["cenoura", "chuchu", "abobrinha", "abóbora", "tomate", "pepino"],
} as const;
