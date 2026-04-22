import type { FaixaEtariaId, RefeicaoId } from "./constants";

export type Role = "super_admin" | "unidade";

export type StatusCardapio =
  | "draft"
  | "em_revisao"
  | "aprovado"
  | "publicado"
  | "arquivado";

export interface Unidade {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string;
  faixas_atendidas: FaixaEtariaId[];
  ativo: boolean;
  created_at: string;
}

export interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  role: Role;
  unidade_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Refeicao {
  id: string;
  cardapio_id: string;
  dia: number; // 1-5
  refeicao: RefeicaoId;
  descricao: string | null;
  especial: "atividade_suspensa" | "feriado" | null;
  feriado_nome: string | null;
}

export interface CardapioPadrao {
  id: string;
  semana_inicio: string; // ISO date
  semana_fim: string;
  faixa_etaria: FaixaEtariaId;
  status: StatusCardapio;
  gerado_por: "ia" | "manual";
  auto_publicar: boolean;
  referencia_prefeitura_id: string | null;
  created_by: string | null;
  aprovado_por: string | null;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemLista {
  quantidade: string;
  unidade: string;
  item: string;
}

export interface ListaCompras {
  id: string;
  unidade_id: string;
  semana_inicio: string;
  itens: ItemLista[];
  enviada_em: string;
  created_by: string | null;
}

export interface CardapioUnidade {
  id: string;
  cardapio_padrao_id: string;
  unidade_id: string;
  lista_compras_id: string | null;
  finalizado: boolean;
  created_at: string;
  updated_at: string;
}

export type GridCardapio = {
  [dia: number]: {
    [refeicao in RefeicaoId]?: {
      descricao: string;
      especial?: "atividade_suspensa" | "feriado" | null;
      feriado_nome?: string | null;
      override?: boolean; // true se veio de cardapio_unidade_refeicoes
    };
  };
};
