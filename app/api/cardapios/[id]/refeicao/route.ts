import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST: upsert de uma célula do cardápio padrão (por cardapio_id + dia + refeicao)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();
    if (usuario?.role !== "super_admin")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const body = await request.json();
    const { dia, refeicao, descricao, especial, feriado_nome } = body;

    const admin = createAdminClient();

    // Deleta refeição antiga (upsert real)
    await admin
      .from("cardapio_refeicoes")
      .delete()
      .eq("cardapio_id", params.id)
      .eq("dia", dia)
      .eq("refeicao", refeicao);

    const { error } = await admin.from("cardapio_refeicoes").insert({
      cardapio_id: params.id,
      dia,
      refeicao,
      descricao: descricao ?? null,
      especial: especial ?? null,
      feriado_nome: feriado_nome ?? null,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: limpa especial do dia (usado pra desmarcar feriado)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();
    if (usuario?.role !== "super_admin")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dia = Number(searchParams.get("dia"));
    if (!dia)
      return NextResponse.json({ error: "dia obrigatório" }, { status: 400 });

    const admin = createAdminClient();

    // Remove todas linhas marcadas como especial naquele dia
    await admin
      .from("cardapio_refeicoes")
      .delete()
      .eq("cardapio_id", params.id)
      .eq("dia", dia)
      .not("especial", "is", null);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
