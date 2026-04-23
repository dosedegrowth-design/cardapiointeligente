import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { RefeicaoId } from "@/lib/constants";

// POST /api/cardapios-unidade/refeicao
// Body: { cardapio_padrao_id, dia, refeicao, descricao }
// Cria ou atualiza override da unidade pra uma célula
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("unidade_id, role")
      .eq("id", user.id)
      .single();

    if (!usuario?.unidade_id)
      return NextResponse.json(
        { error: "Usuário sem unidade" },
        { status: 403 }
      );

    const body = await request.json();
    const { cardapio_padrao_id, dia, refeicao, descricao } = body as {
      cardapio_padrao_id: string;
      dia: number;
      refeicao: RefeicaoId;
      descricao: string;
    };

    if (!cardapio_padrao_id || !dia || !refeicao)
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const admin = createAdminClient();

    // 1) Encontra ou cria cardapios_unidade (1 por [cardapio_padrao_id, unidade_id])
    let { data: cu } = await admin
      .from("cardapios_unidade")
      .select("id")
      .eq("cardapio_padrao_id", cardapio_padrao_id)
      .eq("unidade_id", usuario.unidade_id)
      .maybeSingle();

    if (!cu) {
      const { data: novo, error: err } = await admin
        .from("cardapios_unidade")
        .insert({
          cardapio_padrao_id,
          unidade_id: usuario.unidade_id,
        })
        .select("id")
        .single();
      if (err) throw err;
      cu = novo;
    }

    // 2) Upsert override
    await admin
      .from("cardapio_unidade_refeicoes")
      .delete()
      .eq("cardapio_unidade_id", cu!.id)
      .eq("dia", dia)
      .eq("refeicao", refeicao);

    const { error } = await admin
      .from("cardapio_unidade_refeicoes")
      .insert({
        cardapio_unidade_id: cu!.id,
        dia,
        refeicao,
        descricao,
      });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove override (volta para o padrão)
export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("unidade_id")
      .eq("id", user.id)
      .single();
    if (!usuario?.unidade_id)
      return NextResponse.json({ error: "Sem unidade" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const cardapio_padrao_id = searchParams.get("cardapio_padrao_id");
    const dia = Number(searchParams.get("dia"));
    const refeicao = searchParams.get("refeicao");

    if (!cardapio_padrao_id || !dia || !refeicao)
      return NextResponse.json({ error: "Params inválidos" }, { status: 400 });

    const admin = createAdminClient();
    const { data: cu } = await admin
      .from("cardapios_unidade")
      .select("id")
      .eq("cardapio_padrao_id", cardapio_padrao_id)
      .eq("unidade_id", usuario.unidade_id)
      .maybeSingle();

    if (cu) {
      await admin
        .from("cardapio_unidade_refeicoes")
        .delete()
        .eq("cardapio_unidade_id", cu.id)
        .eq("dia", dia)
        .eq("refeicao", refeicao);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
