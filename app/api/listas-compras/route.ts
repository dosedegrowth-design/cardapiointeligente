import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET: busca lista de compras por semana
// - Super Admin: retorna lista global (unidade_id IS NULL)
// - Unidade: retorna lista global também (usa a que o admin cadastrou)
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
    if (!semana) return NextResponse.json({ itens: [] });

    const admin = createAdminClient();
    const { data } = await admin
      .from("listas_compras")
      .select("*")
      .eq("semana_inicio", semana)
      .is("unidade_id", null)
      .maybeSingle();

    return NextResponse.json({ itens: data?.itens ?? [], id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: salva lista (só super_admin)
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
      return NextResponse.json(
        { error: "Só o Super Admin pode cadastrar a lista de compras" },
        { status: 403 }
      );

    const body = await request.json();
    const { semana_inicio, itens } = body;
    if (!semana_inicio || !Array.isArray(itens))
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const admin = createAdminClient();

    // Upsert lista global (unidade_id = null)
    const { data: existente } = await admin
      .from("listas_compras")
      .select("id")
      .eq("semana_inicio", semana_inicio)
      .is("unidade_id", null)
      .maybeSingle();

    if (existente) {
      const { error } = await admin
        .from("listas_compras")
        .update({
          itens,
          enviada_em: new Date().toISOString(),
          created_by: user.id,
        })
        .eq("id", existente.id);
      if (error) throw error;
      return NextResponse.json({ ok: true, id: existente.id });
    }

    const { data: nova, error } = await admin
      .from("listas_compras")
      .insert({
        unidade_id: null,
        semana_inicio,
        itens,
        created_by: user.id,
        enviada_em: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: nova.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
