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
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[PDF] Não autenticado");
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const semana = searchParams.get("semana");
    const faixa = searchParams.get("faixa") as FaixaEtariaId | null;
    const unidadeIdParam = searchParams.get("unidade_id");

    console.log("[PDF] Request:", { semana, faixa, unidadeIdParam, userId: user.id });

    if (!semana) {
      return NextResponse.json(
        { error: "Parâmetro 'semana' é obrigatório" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Descobre papel do user
    const { data: usuario } = await admin
      .from("usuarios")
      .select("role, unidade_id")
      .eq("id", user.id)
      .single();

    console.log("[PDF] Usuario:", usuario);

    const isSuperAdmin = usuario?.role === "super_admin";

    // Busca cardápios da semana
    // - super_admin: vê qualquer status
    // - unidade: só publicados
    let query = admin
      .from("cardapios_padrao")
      .select("*, cardapio_refeicoes(*)")
      .eq("semana_inicio", semana);

    if (!isSuperAdmin) query = query.eq("status", "publicado");
    if (faixa) query = query.eq("faixa_etaria", faixa);

    const { data: cardapios, error: errCard } = await query;

    if (errCard) {
      console.error("[PDF] Erro ao buscar cardápios:", errCard);
      return NextResponse.json(
        { error: "Erro DB: " + errCard.message },
        { status: 500 }
      );
    }

    console.log("[PDF] Cardápios encontrados:", cardapios?.length ?? 0);

    if (!cardapios || cardapios.length === 0) {
      return NextResponse.json(
        {
          error: `Cardápio não encontrado pra semana ${semana}${faixa ? " faixa " + faixa : ""}. ${isSuperAdmin ? "" : "Talvez ainda não esteja publicado."}`,
        },
        { status: 404 }
      );
    }

    // Descobre a unidade p/ overrides e cor/nome
    let unidadeId = unidadeIdParam ?? usuario?.unidade_id ?? null;
    let unidadeNome = "Rede";
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

    // Monta pages (3 faixas ou 1 se filtrou)
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

      // Aplica overrides da unidade, se houver
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

    console.log("[PDF] Gerando PDF com", pages.length, "páginas");

    const buffer = await renderToBuffer(
      React.createElement(CardapioPDFDocument as any, { pages }) as any
    );

    console.log("[PDF] PDF gerado:", buffer.byteLength, "bytes");

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
    console.error("[PDF] Erro fatal:", err);
    return NextResponse.json(
      { error: err.message ?? "Erro desconhecido" },
      { status: 500 }
    );
  }
}
