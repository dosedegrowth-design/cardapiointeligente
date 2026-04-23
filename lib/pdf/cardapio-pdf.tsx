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

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FDF6EC",
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#3D405B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 12,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
  },
  subtitulo: { fontSize: 9, color: "#3D405B99", marginTop: 2 },
  unidade: { textAlign: "right" },
  unidadeNome: { fontSize: 13, fontWeight: "bold" },
  faixa: { fontSize: 9, color: "#3D405B99", marginTop: 2 },
  table: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#0000001F",
  },
  rowHeader: { flexDirection: "row" },
  rowHeaderCell: {
    padding: 8,
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  rowHeaderRef: {
    padding: 8,
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "left",
    width: 90,
    backgroundColor: "#3D405B",
  },
  row: { flexDirection: "row", borderTopWidth: 1, borderColor: "#0000000F" },
  refCell: {
    padding: 8,
    width: 90,
    backgroundColor: "#F2CC8F33",
    fontSize: 9,
    fontWeight: "bold",
  },
  cell: {
    padding: 8,
    flex: 1,
    borderLeftWidth: 1,
    borderColor: "#0000000F",
    fontSize: 8.5,
    lineHeight: 1.3,
  },
  especialCell: {
    padding: 8,
    flex: 1,
    borderLeftWidth: 1,
    borderColor: "#0000000F",
    backgroundColor: "#f7f7f7",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    color: "#3D405B99",
  },
  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#3D405B66",
  },
});

function CardapioPage({ data }: { data: CardapioPDFData }) {
  const faixa = FAIXAS_ETARIAS.find((f) => f.id === data.faixa_etaria)!;
  const cor = data.cor_primaria || "#E07A5F";

  const especiais: Record<number, Cell | null> = {};
  for (const d of DIAS_SEMANA) {
    const cells = data.grid[d.id] ?? {};
    const esp = Object.values(cells).find((c: any) => c?.especial);
    especiais[d.id] = (esp as Cell) ?? null;
  }

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={[styles.header, { borderBottomColor: cor }]}>
        <View>
          <Text style={[styles.titulo, { color: cor }]}>
            Cardápio Semanal
          </Text>
          <Text style={styles.subtitulo}>
            {formatWeekRange(data.semana_inicio, data.semana_fim)}
          </Text>
        </View>
        <View style={styles.unidade}>
          <Text style={styles.unidadeNome}>{data.unidade_nome}</Text>
          <Text style={styles.faixa}>
            {faixa.nome} · {faixa.idade}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.rowHeader, { backgroundColor: cor }]}>
          <Text style={styles.rowHeaderRef}></Text>
          {DIAS_SEMANA.map((d) => (
            <Text
              key={d.id}
              style={[styles.rowHeaderCell, { backgroundColor: cor }]}
            >
              {d.nome}
            </Text>
          ))}
        </View>

        {REFEICOES.map((ref, idx) => {
          return (
            <View key={ref.id} style={styles.row}>
              <View style={styles.refCell}>
                <Text>{ref.nome}</Text>
              </View>
              {DIAS_SEMANA.map((d) => {
                const esp = especiais[d.id];
                if (esp && ref.id !== "almoco") {
                  return (
                    <View key={d.id} style={styles.cell}>
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
                      <Text>{label}</Text>
                    </View>
                  );
                }
                const cell = data.grid[d.id]?.[ref.id];
                return (
                  <View key={d.id} style={styles.cell}>
                    <Text>{cell?.descricao ?? "—"}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text>
          Gerado em {new Date().toLocaleDateString("pt-BR")}
        </Text>
        <Text>Cardápio Inteligente</Text>
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
