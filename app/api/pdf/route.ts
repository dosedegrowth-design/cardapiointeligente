import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  CardapioPDFDocument,
  type CardapioPDFData,
} from "@/lib/pdf/cardapio-pdf";
import { FAIXAS_ETARIAS, type FaixaEtariaId } from "@/lib/constants";
import React from "react";

/**
 * GET /api/pdf?semana=YYYY-MM-DD&faixa=bercario_X&unidade_id=UUID
 * - unidade_id opcional: se passado, aplica overrides da unidade
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const semana = searchParams.get("semana");
    const faixa = searchParams.get("faixa") as FaixaEtariaId | null;
    const unidadeIdParam = searchParams.get("unidade_id");

    if (!semana)
      return NextResponse.json(
        { error: "semana obrigatória" },
        { status: 400 }
      );

    const admin = createAdminClient();

    // Busca cardápio(s) padrão da semana + refeições
    const query = admin
      .from("cardapios_padrao")
      .select("*, cardapio_refeicoes(*)")
      .eq("semana_inicio", semana);

    if (faixa) query.eq("faixa_etaria", faixa);

    const { data: cardapios } = await query;
    if (!cardapios || cardapios.length === 0)
      return NextResponse.json(
        { error: "Cardápio não encontrado" },
        { status: 404 }
      );

    // Descobre qual unidade
    let unidadeId = unidadeIdParam;
    if (!unidadeId) {
      const { data: usr } = await supabase
        .from("usuarios")
        .select("unidade_id")
        .eq("id", user.id)
        .single();
      unidadeId = usr?.unidade_id ?? null;
    }

    let unidadeNome = "Sua Unidade";
    let corPrimaria = "#E07A5F";

    if (unidadeId) {
      const { data: u } = await admin
        .from("unidades")
        .select("nome, cor_primaria")
        .eq("id", unidadeId)
        .single();
      if (u) {
        unidadeNome = u.nome;
        corPrimaria = u.cor_primaria || "#E07A5F";
      }
    }

    // Para cada cardápio, busca overrides da unidade (se houver)
    const pages: CardapioPDFData[] = [];
    for (const c of cardapios as any[]) {
      const grid: Record<number, Record<string, any>> = {};
      for (const r of c.cardapio_refeicoes ?? []) {
        if (!grid[r.dia]) grid[r.dia] = {};
        grid[r.dia][r.refeicao] = {
          descricao: r.descricao,
          especial: r.especial,
          feriado_nome: r.feriado_nome,
        };
      }

      if (unidadeId) {
        const { data: cu } = await admin
          .from("cardapios_unidade")
          .select("id")
          .eq("cardapio_padrao_id", c.id)
          .eq("unidade_id", unidadeId)
          .maybeSingle();
        if (cu) {
          const { data: overrides } = await admin
            .from("cardapio_unidade_refeicoes")
            .select("*")
            .eq("cardapio_unidade_id", cu.id);
          for (const o of overrides ?? []) {
            if (!grid[o.dia]) grid[o.dia] = {};
            grid[o.dia][o.refeicao] = {
              ...(grid[o.dia][o.refeicao] ?? {}),
              descricao: o.descricao,
            };
          }
        }
      }

      pages.push({
        unidade_nome: unidadeNome,
        cor_primaria: corPrimaria,
        semana_inicio: c.semana_inicio,
        semana_fim: c.semana_fim,
        faixa_etaria: c.faixa_etaria,
        grid,
      });
    }

    // Ordena pelas 3 faixas na ordem lógica
    pages.sort(
      (a, b) =>
        FAIXAS_ETARIAS.findIndex((f) => f.id === a.faixa_etaria) -
        FAIXAS_ETARIAS.findIndex((f) => f.id === b.faixa_etaria)
    );

    const buffer = await renderToBuffer(
      React.createElement(CardapioPDFDocument as any, { pages }) as any
    );

    const slug = unidadeNome
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cardapio-${slug}-${semana}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
