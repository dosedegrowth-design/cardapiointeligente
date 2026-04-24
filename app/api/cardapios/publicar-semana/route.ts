import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/cardapios/publicar-semana
 * Body: { semana_inicio: "YYYY-MM-DD" }
 * Publica TODAS as 3 faixas etárias da semana de uma vez.
 */
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
      .select("role")
      .eq("id", user.id)
      .single();
    if (usuario?.role !== "super_admin")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const { semana_inicio } = await request.json();
    if (!semana_inicio)
      return NextResponse.json(
        { error: "semana_inicio obrigatório" },
        { status: 400 }
      );

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("cardapios_padrao")
      .update({
        status: "publicado",
        publicado_em: new Date().toISOString(),
        aprovado_por: user.id,
      })
      .eq("semana_inicio", semana_inicio)
      .select("id, faixa_etaria, status");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      publicados: data?.length ?? 0,
      cardapios: data,
    });
  } catch (err: any) {
    console.error("[publicar-semana] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/cardapios/publicar-semana?semana_inicio=YYYY-MM-DD
 * Despublica todas as faixas (volta a draft)
 */
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
      .select("role")
      .eq("id", user.id)
      .single();
    if (usuario?.role !== "super_admin")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const semana_inicio = searchParams.get("semana_inicio");
    if (!semana_inicio)
      return NextResponse.json(
        { error: "semana_inicio obrigatório" },
        { status: 400 }
      );

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("cardapios_padrao")
      .update({ status: "draft", publicado_em: null })
      .eq("semana_inicio", semana_inicio)
      .select("id");

    if (error) throw error;

    return NextResponse.json({ ok: true, despublicados: data?.length ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
