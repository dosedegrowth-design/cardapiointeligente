import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function PATCH(
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

    const { status } = await request.json();
    const valid = ["draft", "em_revisao", "aprovado", "publicado", "arquivado"];
    if (!valid.includes(status))
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      );

    const admin = createAdminClient();
    const update: any = { status };
    if (status === "publicado") {
      update.publicado_em = new Date().toISOString();
      update.aprovado_por = user.id;
    }

    const { error } = await admin
      .from("cardapios_padrao")
      .update(update)
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
