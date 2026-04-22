import Anthropic from "@anthropic-ai/sdk";
import { FAIXAS_ETARIAS, type FaixaEtariaId, GRUPOS_EQUIVALENCIA } from "@/lib/constants";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-5-20250929";

export interface CardapioRefeicao {
  dia: number;
  refeicao: "desjejum" | "colacao" | "almoco" | "lanche" | "tarde";
  descricao: string;
  especial?: "atividade_suspensa" | "feriado" | null;
  feriado_nome?: string | null;
}

export interface CardapioGerado {
  faixa_etaria: FaixaEtariaId;
  refeicoes: CardapioRefeicao[];
}

export interface ReferenciaCardapio {
  semana_inicio: string;
  conteudo?: Record<string, any>;
  canva_url?: string;
}

export interface ItemCompra {
  quantidade: string;
  unidade: string;
  item: string;
}

/** Prompt base para o Claude gerar um cardápio semanal */
function systemPrompt(faixa: FaixaEtariaId): string {
  const faixaInfo = FAIXAS_ETARIAS.find((f) => f.id === faixa)!;

  const regras: Record<FaixaEtariaId, string> = {
    bercario_1_0_5m: `- APENAS leite materno ou fórmula infantil 1.
- Não adicione nenhum outro alimento.`,
    bercario_1_6_11m: `- Leite materno ou fórmula infantil 2 em todas as refeições lácteas.
- Introdução alimentar: papinhas, purês, frutas amassadas.
- SEM sal adicionado, SEM açúcar, SEM mel.
- Texturas pastosas/amassadas.`,
    bercario_2_multi: `- Alimentação completa: arroz, feijão, proteína animal, legumes, frutas.
- Variedade entre dias (não repetir proteína em dias consecutivos).
- Fruta todos os dias (desjejum, colação OU tarde).
- Sopas ou risotos na refeição da tarde são bem-vindos.
- Leite integral como base nas refeições lácteas.`,
  };

  return `Você é uma nutricionista infantil especializada em creches municipais brasileiras.
Vai gerar um cardápio semanal para a faixa etária: ${faixaInfo.nome} (${faixaInfo.idade}).

Regras desta faixa etária:
${regras[faixa]}

Estrutura do cardápio:
- 5 dias úteis (segunda a sexta, dia = 1 a 5)
- 5 refeições por dia: desjejum, colação, almoço, lanche, tarde

Grupos de equivalência nutricional (use pra variar):
- Frutas: ${GRUPOS_EQUIVALENCIA.frutas.join(", ")}
- Proteínas: ${GRUPOS_EQUIVALENCIA.proteinas.join(", ")}
- Carboidratos: ${GRUPOS_EQUIVALENCIA.carboidratos.join(", ")}
- Folhas/Verduras: ${GRUPOS_EQUIVALENCIA.folhas.join(", ")}
- Legumes: ${GRUPOS_EQUIVALENCIA.legumes.join(", ")}

Formato da resposta: JSON válido, apenas. Sem explicações, sem markdown.
Schema:
{
  "refeicoes": [
    { "dia": 1, "refeicao": "desjejum", "descricao": "..." },
    ...
  ]
}

Se algum dia for feriado, marque assim:
{ "dia": 2, "refeicao": "almoco", "descricao": null, "especial": "feriado", "feriado_nome": "Tiradentes" }

Se atividade suspensa:
{ "dia": 1, "refeicao": "almoco", "descricao": null, "especial": "atividade_suspensa" }`;
}

/** Gera um cardápio novo baseado em referência da prefeitura + lista de compras */
export async function gerarCardapio(params: {
  faixa_etaria: FaixaEtariaId;
  semana_inicio: string;
  semana_fim: string;
  referencia?: ReferenciaCardapio;
  lista_compras?: ItemCompra[];
  feriados?: Array<{ dia: number; nome: string }>;
}): Promise<CardapioGerado> {
  const {
    faixa_etaria,
    semana_inicio,
    semana_fim,
    referencia,
    lista_compras,
    feriados,
  } = params;

  const userMsg = [
    `Gere o cardápio para a semana de ${semana_inicio} a ${semana_fim}.`,
    "",
    referencia?.conteudo
      ? `Referência da prefeitura (use como inspiração):\n${JSON.stringify(
          referencia.conteudo,
          null,
          2
        )}`
      : referencia?.canva_url
        ? `Referência da prefeitura disponível em: ${referencia.canva_url} (não acessível, gere baseado em padrões típicos)`
        : "Sem referência — gere um cardápio nutricionalmente balanceado típico.",
    "",
    lista_compras && lista_compras.length > 0
      ? `LISTA DE COMPRAS DA UNIDADE (use SOMENTE itens desta lista quando possível):\n${lista_compras
          .map((i) => `- ${i.quantidade} ${i.unidade} ${i.item}`)
          .join("\n")}`
      : "Sem lista de compras específica.",
    "",
    feriados && feriados.length > 0
      ? `FERIADOS/SUSPENSÕES:\n${feriados
          .map((f) => `- Dia ${f.dia}: ${f.nome}`)
          .join("\n")}`
      : "",
    "",
    "Responda APENAS com o JSON.",
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt(faixa_etaria),
    messages: [{ role: "user", content: userMsg }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extrai JSON da resposta (tolera se vier com markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("IA não retornou JSON válido");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    faixa_etaria,
    refeicoes: parsed.refeicoes,
  };
}

/** Substitui itens de um cardápio baseado na lista de compras da unidade */
export async function substituirItens(params: {
  faixa_etaria: FaixaEtariaId;
  cardapio_base: CardapioRefeicao[];
  lista_compras: ItemCompra[];
}): Promise<{
  refeicoes_ajustadas: CardapioRefeicao[];
  substituicoes: Array<{
    dia: number;
    refeicao: string;
    item_original: string;
    item_substituto: string;
    motivo: string;
  }>;
}> {
  const { faixa_etaria, cardapio_base, lista_compras } = params;

  const userMsg = `Tenho este cardápio base:
${JSON.stringify(cardapio_base, null, 2)}

E esta lista de compras da unidade:
${lista_compras.map((i) => `- ${i.quantidade} ${i.unidade} ${i.item}`).join("\n")}

Ajuste o cardápio: para cada item do cardápio que NÃO está na lista de compras, substitua por um item equivalente nutricional que ESTÁ na lista.

Responda com JSON no formato:
{
  "refeicoes_ajustadas": [ ...mesmo formato do cardapio_base... ],
  "substituicoes": [
    { "dia": 3, "refeicao": "almoco", "item_original": "maçã", "item_substituto": "pera", "motivo": "maçã não está na lista; pera está disponível" }
  ]
}

Responda APENAS com o JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt(faixa_etaria),
    messages: [{ role: "user", content: userMsg }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("IA não retornou JSON válido");

  return JSON.parse(jsonMatch[0]);
}
