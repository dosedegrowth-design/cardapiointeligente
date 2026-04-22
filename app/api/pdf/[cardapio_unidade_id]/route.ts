import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { renderCardapioHTML } from "@/lib/pdf/cardapio-template";
import { FAIXAS_ETARIAS, type FaixaEtariaId } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: { cardapio_unidade_id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = createAdminClient();

    // Busca cardápio de unidade + refeições (padrão + sobrescritas) + unidade
    const { data: cu, error } = await admin
      .from("cardapios_unidade")
      .select(
        `*,
        unidades(*),
        cardapios_padrao(*, cardapio_refeicoes(*)),
        cardapio_unidade_refeicoes(*)`
      )
      .eq("id", params.cardapio_unidade_id)
      .single();

    if (error || !cu) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const unidade = (cu as any).unidades;
    const cardapio = (cu as any).cardapios_padrao;
    const refeicoes = cardapio.cardapio_refeicoes ?? [];
    const overrides = (cu as any).cardapio_unidade_refeicoes ?? [];

    // Monta grid com overrides aplicados
    const grid: Record<number, Record<string, any>> = {};
    for (const r of refeicoes) {
      if (!grid[r.dia]) grid[r.dia] = {};
      grid[r.dia][r.refeicao] = {
        descricao: r.descricao,
        especial: r.especial,
        feriado_nome: r.feriado_nome,
      };
    }
    for (const o of overrides) {
      if (!grid[o.dia]) grid[o.dia] = {};
      grid[o.dia][o.refeicao] = {
        ...(grid[o.dia][o.refeicao] ?? {}),
        descricao: o.descricao,
      };
    }

    const html = renderCardapioHTML({
      unidade_nome: unidade.nome,
      cor_primaria: unidade.cor_primaria || "#E07A5F",
      semana_inicio: cardapio.semana_inicio,
      semana_fim: cardapio.semana_fim,
      faixa_etaria: cardapio.faixa_etaria as FaixaEtariaId,
      grid,
    });

    // Usa Gotenberg pra converter HTML → PDF
    const gotenbergUrl = process.env.GOTENBERG_URL;
    if (!gotenbergUrl) {
      // fallback: retorna o HTML pra visualização
      return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
    }

    const formData = new FormData();
    formData.append(
      "files",
      new Blob([html], { type: "text/html" }),
      "index.html"
    );

    const res = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro no Gotenberg" },
        { status: 500 }
      );
    }

    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cardapio-${unidade.slug}-${cardapio.semana_inicio}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
