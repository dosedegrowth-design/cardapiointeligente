import { GoogleGenerativeAI } from "@google/generative-ai";
import { FAIXAS_ETARIAS, type FaixaEtariaId, GRUPOS_EQUIVALENCIA } from "@/lib/constants";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const MODEL_NAME = "gemini-2.5-flash";

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

/**
 * Padrões extraídos dos PDFs oficiais da CODAE/Prefeitura de SP (março + abril 2026)
 * Usados como base de conhecimento pra IA não precisar acessar PDFs externos.
 */
const PADRAO_CODAE = `
PADRÕES DA CODAE (Coordenadoria de Alimentação Escolar - SP):

== ESTRUTURA DO ALMOÇO (BERÇÁRIO II / 1-4 ANOS) ==
- Segunda a sexta: sempre ARROZ + FEIJÃO + PROTEÍNA + LEGUME/FOLHA + FRUTA
- Variar feijão entre: carioca, preto, branco, fradinho, lentilha, grão-de-bico
- Variar carboidrato: arroz branco, arroz integral, macarrão (penne, parafuso, penne integral, parafuso integral, caracolino, padre nosso), mandioca, mandioquinha, batata, batata doce, inhame, polenta, cará
- Variar proteína: carne bovina (moída/iscas/acebolada/Kafta/Ragú/Rocambole), carne suína (com abóbora/pimentão/toque de limão/copa lombo), frango (assado/desfiado/refogado/em cubos/arrepiado/ao molho), peixe (grelhado/cozido/ao molho/ao vinagrete/à lusitana), ovo (mexido/omelete/à portuguesa)

== ESQUEMA DE REFEIÇÕES DIÁRIAS (BERÇÁRIO II) ==
- DESJEJUM: leite integral/com cacau + carboidrato (pão caseiro/francês/de forma, biscoito de polvilho, cuscuz, crepioca, tapioca, bolo de fubá, panqueca de banana, brownie de banana, barrinha de banana com aveia) + fruta
- COLAÇÃO: 1 fruta
- ALMOÇO: ver estrutura acima
- LANCHE: leite integral (puro, com cacau, batido com fruta tipo "Leite rosa" = banana+maçã+beterraba)
- REFEIÇÃO DA TARDE:
  - Quarta/sexta: SOPA ou RISOTO com PROTEÍNA VEGETAL (grão de bico, feijão variado, lentilha, ervilha)
  - Outros dias: sopa/risoto/massas COM proteína animal (frango, carne, peixe)

== BERÇÁRIO I (6-11 MESES) ==
- Mesmo almoço do berçário II, mas em consistência adequada (pastosa/amassada)
- Desjejum/lanche/tarde: Leite materno ou Fórmula 2 (com fruta)
- Colação: 1 fruta
- SEM sal, SEM açúcar, SEM mel. Peixe empanado frito: proibido (só >2 anos)

== BERÇÁRIO I (0-5 MESES) ==
- SÓ leite materno ou Fórmula 1 em todas as refeições

== DIAS ESPECIAIS ==
- Suspensão de expediente e feriados marcados explicitamente
- Nesses dias o almoço inteiro vira "FERIADO" ou "SUSPENSÃO DE EXPEDIENTE"

== EXEMPLOS REAIS DA CODAE (abril 2026) ==
Almoço: "Arroz + Feijão preto + Carne bovina moída refogada com molho de tomate + Acelga refogada + Melão"
Almoço: "Macarrão penne ao pomodoro + Frango assado + Brócolis refogado + Banana"
Almoço: "Arroz + Feijão branco + Carne suína ao toque de limão + Cenoura ralada refogada + Melancia"
Almoço: "Arroz integral + Feijão carioca + Omelete com alho poró + Escarola refogada + Laranja"
Almoço: "Arroz + Feijão carioca + Filé de peixe grelhado + Pirão de peixe com coentro e pimentão + Melancia"
Sopa vegetariana: "Sopa (feijão jalo, inhame, abobrinha, espinafre)"
Sopa vegetariana: "Sopa (ervilha seca, macarrão, cenoura, couve)"
Sopa vegetariana: "Sopa (feijão carioca, macarrão, vagem, escarola)"
Sopa vegetariana: "Sopa (lentilha, batata, abóbora, acelga)"
Sopa vegetariana: "Sopa (grão-de-bico, cará, abóbora, almeirão)"
Risoto: "Risoto com carne bovina, abóbora e tomate"
Risoto: "Risoto com frango, cenoura e chicória"
Desjejum: "Leite integral com cacau + Crepioca + Melancia"
Desjejum: "Leite integral batido com maçã e abacate + Pão francês com queijo"
Desjejum: "Leite integral com cacau + Torta de carne moída com cenoura e milho + Banana"
`;

/** Prompt base para o Gemini gerar um cardápio semanal */
function systemPrompt(faixa: FaixaEtariaId): string {
  const faixaInfo = FAIXAS_ETARIAS.find((f) => f.id === faixa)!;

  const regras: Record<FaixaEtariaId, string> = {
    bercario_1_0_5m: `- APENAS leite materno ou fórmula infantil 1 em TODAS as refeições.
- Descrição padrão: "Leite materno ou Fórmula infantil 1"`,

    bercario_1_6_11m: `- Desjejum/lanche/tarde: "Leite materno ou Fórmula infantil 2 + <fruta>"
- Colação: 1 fruta (textura raspada/amassada)
- Almoço: estrutura completa ARROZ + FEIJÃO + PROTEÍNA + LEGUME + FRUTA
- SEM sal adicionado, SEM açúcar, SEM mel
- Texturas pastosas/amassadas
- Peixe empanado frito: proibido`,

    bercario_2_multi: `- Alimentação completa seguindo estrutura CODAE.
- DESJEJUM: leite integral/cacau + carboidrato + fruta
- COLAÇÃO: 1 fruta
- ALMOÇO: ARROZ + FEIJÃO + PROTEÍNA ANIMAL + LEGUME/FOLHA + FRUTA
- LANCHE: leite integral
- TARDE: sopa / risoto / massa

REGRAS OBRIGATÓRIAS ADICIONAIS:
1. QUARTA E SEXTA — refeição da tarde deve ter PROTEÍNA VEGETAL (grão de bico, lentilha, feijão, ervilha). SEM carne/frango/peixe nessas refeições.
2. A CADA 15 DIAS, pelo menos 1 dia com ARROZ INTEGRAL ou MACARRÃO INTEGRAL
3. VARIEDADE é obrigatória: varie os tipos de feijão entre os dias (carioca, preto, branco, fradinho, lentilha, grão-de-bico)
4. Não repetir a mesma proteína em dias consecutivos
5. Fruta todos os dias (desjejum + colação + tarde ou sobremesa)`,
  };

  return `Você é a nutricionista RT da CODAE (Coordenadoria de Alimentação Escolar - SP), elaborando um Cardápio Inteligente para CEI (Centro de Educação Infantil).
Vai gerar um cardápio semanal para a faixa etária: ${faixaInfo.nome} (${faixaInfo.idade}).

${PADRAO_CODAE}

REGRAS DESTA FAIXA ETÁRIA:
${regras[faixa]}

Estrutura do cardápio a gerar:
- 5 dias úteis (segunda=1, terça=2, quarta=3, quinta=4, sexta=5)
- 5 refeições por dia: desjejum, colacao, almoco, lanche, tarde

Grupos de equivalência nutricional:
- Frutas: ${GRUPOS_EQUIVALENCIA.frutas.join(", ")}
- Proteínas: ${GRUPOS_EQUIVALENCIA.proteinas.join(", ")}
- Carboidratos: ${GRUPOS_EQUIVALENCIA.carboidratos.join(", ")}
- Folhas/Verduras: ${GRUPOS_EQUIVALENCIA.folhas.join(", ")}
- Legumes: ${GRUPOS_EQUIVALENCIA.legumes.join(", ")}

Formato da resposta: JSON válido, apenas. Sem explicações, sem markdown.
Schema:
{
  "refeicoes": [
    { "dia": 1, "refeicao": "desjejum", "descricao": "Leite integral com cacau + Pão caseiro com queijo + Mamão" }
  ]
}

Dias especiais:
{ "dia": 2, "refeicao": "almoco", "descricao": null, "especial": "feriado", "feriado_nome": "Tiradentes" }
{ "dia": 1, "refeicao": "almoco", "descricao": null, "especial": "atividade_suspensa" }

Linguagem igual aos PDFs da CODAE: "Arroz + Feijão carioca + Carne bovina moída refogada com molho de tomate + Acelga refogada + Melão"`;
}

async function callGemini(system: string, user: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: system,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(user);
  return result.response.text();
}

function extractJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("IA não retornou JSON válido");
  return JSON.parse(match[0]);
}

/** Gera um cardápio novo baseado em referência + lista de compras */
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
      ? `Referência específica desta semana (use como guia):\n${JSON.stringify(
          referencia.conteudo,
          null,
          2
        )}`
      : "Sem referência específica desta semana. Siga os PADRÕES DA CODAE do system prompt.",
    "",
    lista_compras && lista_compras.length > 0
      ? `LISTA DE COMPRAS DA SEMANA (use SOMENTE itens desta lista, faça substituições nutricionalmente equivalentes quando faltar):
${lista_compras.map((i) => `- ${i.quantidade} ${i.unidade} ${i.item}`).join("\n")}`
      : "Sem lista de compras — use itens comuns de creche.",
    "",
    feriados && feriados.length > 0
      ? `FERIADOS/SUSPENSÕES:\n${feriados
          .map((f) => `- Dia ${f.dia}: ${f.nome}`)
          .join("\n")}`
      : "",
    "",
    "Responda APENAS com o JSON.",
  ].join("\n");

  const text = await callGemini(systemPrompt(faixa_etaria), userMsg);
  const parsed = extractJSON(text);

  return {
    faixa_etaria,
    refeicoes: parsed.refeicoes,
  };
}

/** Substitui itens baseado em lista de compras */
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

  const userMsg = `Cardápio base:
${JSON.stringify(cardapio_base, null, 2)}

Lista de compras:
${lista_compras.map((i) => `- ${i.quantidade} ${i.unidade} ${i.item}`).join("\n")}

Ajuste: itens do cardápio que NÃO estão na lista, substitua por equivalentes que ESTÃO.

JSON:
{
  "refeicoes_ajustadas": [ ... ],
  "substituicoes": [ { "dia": 3, "refeicao": "almoco", "item_original": "maçã", "item_substituto": "pera", "motivo": "maçã não comprada" } ]
}`;

  const text = await callGemini(systemPrompt(faixa_etaria), userMsg);
  return extractJSON(text);
}
