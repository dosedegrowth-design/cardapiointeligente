import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UnidadeSemanaClient } from "./unidade-semana-client";
import { type FaixaEtariaId } from "@/lib/constants";

export default async function UnidadeSemanaPage({
  params,
  searchParams,
}: {
  params: { semana: string };
  searchParams: { faixa?: FaixaEtariaId };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, unidade_id")
    .eq("id", user.id)
    .single();

  const { data: cardapios } = await supabase
    .from("cardapios_padrao")
    .select("*, cardapio_refeicoes(*)")
    .eq("semana_inicio", params.semana)
    .eq("status", "publicado");

  if (!cardapios || cardapios.length === 0) notFound();

  // Busca overrides da unidade (se houver)
  let overridesByCardapio: Record<string, any[]> = {};
  let horariosUnidade: Record<string, string> | null = null;
  if (usuario?.unidade_id) {
    const { data: cus } = await supabase
      .from("cardapios_unidade")
      .select("id, cardapio_padrao_id, cardapio_unidade_refeicoes(*)")
      .eq("unidade_id", usuario.unidade_id)
      .in(
        "cardapio_padrao_id",
        (cardapios as any[]).map((c) => c.id)
      );
    for (const cu of cus ?? []) {
      overridesByCardapio[(cu as any).cardapio_padrao_id] =
        (cu as any).cardapio_unidade_refeicoes ?? [];
    }

    // Busca horários customizados (defensivo: coluna pode ainda não existir)
    try {
      const { data: u } = await supabase
        .from("unidades")
        .select("horarios")
        .eq("id", usuario.unidade_id)
        .single();
      horariosUnidade = (u as any)?.horarios ?? null;
    } catch {
      horariosUnidade = null;
    }
  }

  return (
    <UnidadeSemanaClient
      semana={params.semana}
      faixaInicial={searchParams.faixa ?? "bercario_2_multi"}
      cardapios={cardapios as any}
      overrides={overridesByCardapio}
      horarios={horariosUnidade}
      editable={!!usuario?.unidade_id}
    />
  );
}
