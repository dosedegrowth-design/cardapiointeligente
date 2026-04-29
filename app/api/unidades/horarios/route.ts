import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const HORARIOS_PADRAO = {
  desjejum: "07h30",
  colacao: "09h00",
  almoco: "10h45",
  lanche: "13h30",
  tarde: "14h45",
};

/**
 * GET /api/unidades/horarios?unidade_id=UUID (opcional)
 * - Sem unidade_id: retorna horários da unidade do user logado
 * - Com unidade_id: super_admin pode pedir de qualquer unidade
 * - Se unidade não tem horários customizados, retorna padrão
 */
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
      .select("role, unidade_id")
      .eq("id", user.id)
      .single();
    if (!usuario)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    let unidadeId = searchParams.get("unidade_id") ?? usuario.unidade_id;
    if (!unidadeId)
      return NextResponse.json({
        horarios: HORARIOS_PADRAO,
        customizado: false,
      });

    // Super admin pode ver de qualquer unidade; outros só da própria
    if (usuario.role !== "super_admin" && unidadeId !== usuario.unidade_id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const admin = createAdminClient();
    // Tenta buscar com coluna horarios; se não existir ainda, faz fallback
    let unidadeData: { nome?: string; horarios?: any } = {};
    try {
      const { data: u, error } = await admin
        .from("unidades")
        .select("nome, horarios")
        .eq("id", unidadeId)
        .single();
      if (error && error.code !== "42703") throw error; // 42703 = column does not exist
      unidadeData = u ?? {};
    } catch (e: any) {
      // Fallback sem coluna horarios
      const { data: u } = await admin
        .from("unidades")
        .select("nome")
        .eq("id", unidadeId)
        .single();
      unidadeData = u ?? {};
    }

    return NextResponse.json({
      unidade_nome: unidadeData?.nome ?? null,
      horarios: unidadeData?.horarios ?? HORARIOS_PADRAO,
      customizado: !!unidadeData?.horarios,
      padrao: HORARIOS_PADRAO,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/unidades/horarios
 * Body: { horarios: { desjejum: "07h30", colacao: "...", ... } }
 * Atualiza horários da própria unidade (ou super_admin pode passar unidade_id)
 */
export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role, unidade_id")
      .eq("id", user.id)
      .single();
    if (!usuario)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const body = await request.json();
    const { horarios, unidade_id } = body as {
      horarios: Record<string, string>;
      unidade_id?: string;
    };
    if (!horarios)
      return NextResponse.json({ error: "horarios obrigatório" }, { status: 400 });

    // Valida campos
    const camposValidos = ["desjejum", "colacao", "almoco", "lanche", "tarde"];
    for (const k of Object.keys(horarios)) {
      if (!camposValidos.includes(k))
        return NextResponse.json(
          { error: `Campo inválido: ${k}` },
          { status: 400 }
        );
    }

    // Determina alvo
    const targetUnidadeId =
      usuario.role === "super_admin" && unidade_id
        ? unidade_id
        : usuario.unidade_id;

    if (!targetUnidadeId)
      return NextResponse.json(
        { error: "Sem unidade pra atualizar" },
        { status: 400 }
      );

    const admin = createAdminClient();
    const { error } = await admin
      .from("unidades")
      .update({ horarios })
      .eq("id", targetUnidadeId);

    if (error) throw error;

    return NextResponse.json({ ok: true, horarios });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/unidades/horarios
 * Volta para horários padrão (seta NULL)
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
      .select("unidade_id")
      .eq("id", user.id)
      .single();
    if (!usuario?.unidade_id)
      return NextResponse.json({ error: "Sem unidade" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin
      .from("unidades")
      .update({ horarios: null })
      .eq("id", usuario.unidade_id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
