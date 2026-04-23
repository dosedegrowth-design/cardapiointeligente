import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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
    if (!usuario?.unidade_id) return NextResponse.json({ itens: [] });

    const { searchParams } = new URL(request.url);
    const semana = searchParams.get("semana");
    if (!semana) return NextResponse.json({ itens: [] });

    const { data } = await supabase
      .from("listas_compras")
      .select("*")
      .eq("unidade_id", usuario.unidade_id)
      .eq("semana_inicio", semana)
      .maybeSingle();

    return NextResponse.json({ itens: data?.itens ?? [], id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
      .select("unidade_id")
      .eq("id", user.id)
      .single();
    if (!usuario?.unidade_id)
      return NextResponse.json(
        { error: "Usuário sem unidade" },
        { status: 400 }
      );

    const body = await request.json();
    const { semana_inicio, itens } = body;
    if (!semana_inicio || !Array.isArray(itens))
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });

    const { data, error } = await supabase
      .from("listas_compras")
      .upsert(
        {
          unidade_id: usuario.unidade_id,
          semana_inicio,
          itens,
          created_by: user.id,
          enviada_em: new Date().toISOString(),
        },
        { onConflict: "unidade_id,semana_inicio" }
      )
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
