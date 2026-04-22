import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { gerarCardapio } from "@/lib/ai/cardapio-generator";
import { FAIXAS_ETARIAS, type FaixaEtariaId } from "@/lib/constants";
import { getFridayOfWeek, toISODate } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    // 1) Auth check
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Só super_admin pode gerar
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();
    if (usuario?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // 2) Parse body
    const body = await request.json();
    const { semana_inicio } = body as { semana_inicio: string };
    if (!semana_inicio) {
      return NextResponse.json(
        { error: "semana_inicio é obrigatório" },
        { status: 400 }
      );
    }

    const semana_fim = toISODate(
      getFridayOfWeek(new Date(semana_inicio + "T00:00:00"))
    );

    // 3) Buscar referência da prefeitura (mês correspondente)
    const admin = createAdminClient();
    const mes = new Date(semana_inicio).getMonth() + 1;
    const ano = new Date(semana_inicio).getFullYear();
    const { data: referencias } = await admin
      .from("biblioteca_prefeitura")
      .select("*")
      .eq("ano", ano)
      .eq("mes", mes)
      .limit(1);

    const referencia = referencias?.[0];

    // 4) Gerar os 3 cardápios (em paralelo)
    const gerados = await Promise.all(
      FAIXAS_ETARIAS.map((f) =>
        gerarCardapio({
          faixa_etaria: f.id as FaixaEtariaId,
          semana_inicio,
          semana_fim,
          referencia: referencia
            ? { semana_inicio: referencia.semana_inicio, conteudo: referencia.conteudo_extraido, canva_url: referencia.canva_url }
            : undefined,
        })
      )
    );

    // 5) Salvar no Supabase (upsert por semana + faixa)
    for (const g of gerados) {
      // Deletar cardápio existente pra essa semana/faixa (se houver)
      const { data: existente } = await admin
        .from("cardapios_padrao")
        .select("id")
        .eq("semana_inicio", semana_inicio)
        .eq("faixa_etaria", g.faixa_etaria)
        .maybeSingle();

      if (existente) {
        await admin.from("cardapios_padrao").delete().eq("id", existente.id);
      }

      const { data: novo, error: err1 } = await admin
        .from("cardapios_padrao")
        .insert({
          semana_inicio,
          semana_fim,
          faixa_etaria: g.faixa_etaria,
          status: "draft",
          gerado_por: "ia",
          referencia_prefeitura_id: referencia?.id ?? null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (err1 || !novo) throw new Error(err1?.message || "Erro ao salvar cardápio");

      // Inserir refeições
      const refeicoesInsert = g.refeicoes.map((r) => ({
        cardapio_id: novo.id,
        dia: r.dia,
        refeicao: r.refeicao,
        descricao: r.descricao,
        especial: r.especial ?? null,
        feriado_nome: r.feriado_nome ?? null,
      }));

      const { error: err2 } = await admin
        .from("cardapio_refeicoes")
        .insert(refeicoesInsert);

      if (err2) throw new Error(err2.message);
    }

    return NextResponse.json({ ok: true, semana_inicio });
  } catch (err: any) {
    console.error("Erro ao gerar cardápio:", err);
    return NextResponse.json(
      { error: err.message ?? "Erro desconhecido" },
      { status: 500 }
    );
  }
}
