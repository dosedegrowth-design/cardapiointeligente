import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { FaixaEtariaId, RefeicaoId } from "@/lib/constants";
import { DIAS_SEMANA, REFEICOES, FAIXAS_ETARIAS } from "@/lib/constants";
import { formatWeekRange } from "@/lib/utils";

// Fontes via CDN estável (jsdelivr / fontsource)
// Fraunces = serif elegante (títulos)
Font.register({
  family: "Fraunces",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/fraunces@latest/latin-700-normal.ttf",
      fontWeight: 700,
    },
  ],
});

// Inter = sans moderna (corpo)
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.ttf",
      fontWeight: 500,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf",
      fontWeight: 600,
    },
  ],
});

interface Cell {
  descricao: string | null;
  especial?: string | null;
  feriado_nome?: string | null;
}

export interface CardapioPDFData {
  unidade_nome: string;
  cor_primaria: string;
  semana_inicio: string;
  semana_fim: string;
  faixa_etaria: FaixaEtariaId;
  grid: Record<number, Record<string, Cell>>;
}

// Cores pastel por refeição (estilo Studio Cute)
const CORES_REFEICAO: Record<RefeicaoId, { bg: string; label: string }> = {
  desjejum: { bg: "#F7D5CA", label: "#8B3A2E" }, // rosa pastel
  colacao: { bg: "#FFE3A3", label: "#7A5200" }, // amarelo manteiga
  almoco: { bg: "#CEE5D0", label: "#2E5B35" }, // verde menta
  lanche: { bg: "#FFCDB2", label: "#8B4E2F" }, // pêssego
  tarde: { bg: "#E0C8F5", label: "#5A3A7C" }, // lavanda
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    fontFamily: "Inter",
    fontSize: 8.5,
    color: "#2D2D2D",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerLeft: { flex: 1 },
  titulo: {
    fontFamily: "Fraunces",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
    fontFamily: "Inter",
  },
  headerRight: { textAlign: "right", alignItems: "flex-end" },
  unidadeNome: {
    fontFamily: "Fraunces",
    fontSize: 14,
    fontWeight: 700,
    color: "#1F2937",
  },
  faixa: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 12,
    opacity: 0.4,
  },

  // Tabela
  table: {
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },

  // Header row (dias da semana)
  headerRow: {
    flexDirection: "row",
  },
  headerRefCell: {
    width: 78,
    padding: 8,
    backgroundColor: "#FAFAFA",
  },
  headerDayCell: {
    flex: 1,
    padding: 9,
    alignItems: "center",
    borderLeftWidth: 0.5,
    borderLeftColor: "#E5E7EB",
  },
  headerDayText: {
    fontFamily: "Fraunces",
    fontSize: 10.5,
    fontWeight: 600,
    color: "#1F2937",
  },

  // Row de refeição
  row: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    minHeight: 58,
  },

  // Célula lateral (nome refeição) — centralizado
  refCell: {
    width: 78,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  refCellLabel: {
    fontFamily: "Fraunces",
    fontSize: 9,
    fontWeight: 600,
    textAlign: "center",
  },
  refCellHora: {
    fontSize: 7,
    color: "#9CA3AF",
    marginTop: 2,
    fontFamily: "Inter",
    textAlign: "center",
  },

  // Célula de conteúdo — centralizado H+V
  cell: {
    flex: 1,
    padding: 6,
    borderLeftWidth: 0.5,
    borderLeftColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  cellText: {
    fontSize: 7.5,
    lineHeight: 1.35,
    color: "#374151",
    textAlign: "center",
  },
  cellEmpty: {
    fontSize: 7.5,
    color: "#D1D5DB",
    fontStyle: "italic",
    textAlign: "center",
  },

  // Especial (feriado/suspensa)
  especialCell: {
    flex: 1,
    borderLeftWidth: 0.5,
    borderLeftColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  especialText: {
    fontSize: 9,
    fontFamily: "Fraunces",
    fontWeight: 600,
    color: "#6B7280",
    textAlign: "center",
  },

  // Footer
  footer: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#9CA3AF",
    fontFamily: "Inter",
  },
  footerBrand: {
    fontFamily: "Fraunces",
    fontSize: 8,
    fontWeight: 600,
    color: "#6B7280",
  },
});

function CardapioPage({ data }: { data: CardapioPDFData }) {
  const faixa = FAIXAS_ETARIAS.find((f) => f.id === data.faixa_etaria)!;
  const cor = data.cor_primaria || "#E07A5F";

  // Detecta dias especiais
  const especiais: Record<number, Cell | null> = {};
  for (const d of DIAS_SEMANA) {
    const cells = data.grid[d.id] ?? {};
    const esp = Object.values(cells).find((c: any) => c?.especial);
    especiais[d.id] = (esp as Cell) ?? null;
  }

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.titulo, { color: cor }]}>Cardápio Semanal</Text>
          <Text style={styles.subtitulo}>
            {formatWeekRange(data.semana_inicio, data.semana_fim)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.unidadeNome}>{data.unidade_nome}</Text>
          <Text style={styles.faixa}>
            {faixa.nome} · {faixa.idade}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: cor }]} />

      {/* Tabela */}
      <View style={styles.table}>
        {/* Cabeçalho: dias */}
        <View style={styles.headerRow}>
          <View style={styles.headerRefCell}>
            <Text></Text>
          </View>
          {DIAS_SEMANA.map((d) => (
            <View
              key={d.id}
              style={[
                styles.headerDayCell,
                { backgroundColor: "#FAFAFA" },
              ]}
            >
              <Text style={styles.headerDayText}>{d.nome}</Text>
            </View>
          ))}
        </View>

        {/* Linhas de refeição */}
        {REFEICOES.map((ref) => {
          const cores = CORES_REFEICAO[ref.id];
          return (
            <View key={ref.id} style={styles.row}>
              {/* Label da refeição */}
              <View
                style={[styles.refCell, { backgroundColor: cores.bg }]}
              >
                <Text style={[styles.refCellLabel, { color: cores.label }]}>
                  {ref.nome}
                </Text>
                <Text style={styles.refCellHora}>{ref.horario}</Text>
              </View>

              {/* Células dos dias */}
              {DIAS_SEMANA.map((d) => {
                const esp = especiais[d.id];
                if (esp && ref.id !== "almoco") {
                  return (
                    <View
                      key={d.id}
                      style={[
                        styles.cell,
                        { backgroundColor: "#F9FAFB" },
                      ]}
                    >
                      <Text> </Text>
                    </View>
                  );
                }
                if (esp && ref.id === "almoco") {
                  const label =
                    esp.especial === "feriado"
                      ? esp.feriado_nome ?? "Feriado"
                      : "Atividade suspensa";
                  return (
                    <View key={d.id} style={styles.especialCell}>
                      <Text style={styles.especialText}>{label}</Text>
                    </View>
                  );
                }
                const cell = data.grid[d.id]?.[ref.id];
                return (
                  <View key={d.id} style={styles.cell}>
                    {cell?.descricao ? (
                      <Text style={styles.cellText}>{cell.descricao}</Text>
                    ) : (
                      <Text style={styles.cellEmpty}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          gerado em {new Date().toLocaleDateString("pt-BR")} ·{" "}
          {data.unidade_nome}
        </Text>
        <Text style={styles.footerBrand}>
          Cardápio Inteligente
        </Text>
      </View>
    </Page>
  );
}

export function CardapioPDFDocument({
  pages,
}: {
  pages: CardapioPDFData[];
}) {
  return (
    <Document>
      {pages.map((p, i) => (
        <CardapioPage key={i} data={p} />
      ))}
    </Document>
  );
}
