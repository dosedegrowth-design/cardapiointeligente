import { DIAS_SEMANA, REFEICOES, FAIXAS_ETARIAS, type FaixaEtariaId } from "@/lib/constants";
import { formatWeekRange } from "@/lib/utils";

interface Cell {
  descricao: string | null;
  especial?: string | null;
  feriado_nome?: string | null;
}

interface TemplateData {
  unidade_nome: string;
  cor_primaria: string;
  semana_inicio: string;
  semana_fim: string;
  faixa_etaria: FaixaEtariaId;
  grid: Record<number, Record<string, Cell>>;
}

/** Gera HTML pronto pra Gotenberg renderizar em PDF */
export function renderCardapioHTML(data: TemplateData): string {
  const faixa = FAIXAS_ETARIAS.find((f) => f.id === data.faixa_etaria)!;

  // Detecta dias especiais (ocupa dia todo)
  const especiais: Record<number, Cell | null> = {};
  DIAS_SEMANA.forEach((d) => {
    const cells = data.grid[d.id] ?? {};
    const esp = Object.values(cells).find((c) => c?.especial);
    especiais[d.id] = esp ?? null;
  });

  const linhas = REFEICOES.map((ref) => {
    const cells = DIAS_SEMANA.map((d) => {
      const esp = especiais[d.id];
      if (esp && ref.id !== "almoco") return `<td class="esp-continuation"></td>`;
      if (esp && ref.id === "almoco") {
        const tipo = esp.especial === "feriado" ? (esp.feriado_nome ?? "Feriado") : "Atividade suspensa";
        return `<td class="especial" rowspan="5">${tipo}</td>`;
      }
      const cell = data.grid[d.id]?.[ref.id];
      return `<td>${cell?.descricao ?? "—"}</td>`;
    }).join("");

    return `<tr>
      <th class="ref">${ref.nome}</th>
      ${cells}
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Cardápio ${data.unidade_nome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #FDF6EC;
      color: #3D405B;
      padding: 14mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8mm;
      border-bottom: 2px solid ${data.cor_primaria};
      margin-bottom: 8mm;
    }
    .titulo {
      font-family: "Georgia", serif;
      font-size: 32pt;
      font-weight: 700;
      color: ${data.cor_primaria};
      letter-spacing: -0.5pt;
    }
    .subtitulo {
      font-size: 10pt;
      color: #3D405B99;
      margin-top: 2mm;
    }
    .unidade {
      text-align: right;
    }
    .unidade-nome {
      font-family: "Georgia", serif;
      font-size: 14pt;
      font-weight: 700;
    }
    .faixa {
      font-size: 10pt;
      color: #3D405B99;
      margin-top: 1mm;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: white;
      border-radius: 4mm;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    thead th {
      background: ${data.cor_primaria};
      color: white;
      font-family: "Georgia", serif;
      font-weight: 600;
      font-size: 12pt;
      padding: 4mm 3mm;
      text-align: center;
    }
    thead th:first-child {
      background: #3D405B;
    }
    th.ref {
      background: #F2CC8F30;
      font-family: "Georgia", serif;
      font-weight: 600;
      font-size: 10pt;
      padding: 4mm 3mm;
      text-align: left;
      color: #3D405B;
      width: 18%;
      border-top: 1px solid #0000000F;
    }
    td {
      padding: 4mm 3mm;
      border-top: 1px solid #0000000F;
      border-left: 1px solid #0000000F;
      font-size: 9pt;
      line-height: 1.4;
      vertical-align: top;
      width: 16.4%;
    }
    td.especial {
      background: #f7f7f7;
      text-align: center;
      vertical-align: middle;
      font-weight: 600;
      font-size: 10pt;
      color: #3D405B99;
      text-transform: uppercase;
      letter-spacing: 1pt;
    }
    td.esp-continuation { display: none; }
    .footer {
      margin-top: 8mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #3D405B66;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="titulo">Cardápio Semanal</div>
      <div class="subtitulo">${formatWeekRange(data.semana_inicio, data.semana_fim)}</div>
    </div>
    <div class="unidade">
      <div class="unidade-nome">${data.unidade_nome}</div>
      <div class="faixa">${faixa.nome} · ${faixa.idade}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th></th>
        ${DIAS_SEMANA.map((d) => `<th>${d.nome}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>

  <div class="footer">
    <div>gerado com carinho em ${new Date().toLocaleDateString("pt-BR")}</div>
    <div>Cardápio Inteligente · Dose de Growth</div>
  </div>
</body>
</html>`;
}
