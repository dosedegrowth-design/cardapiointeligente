import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SemanaClient } from "./semana-client";
import { type FaixaEtariaId } from "@/lib/constants";

export default async function SemanaDetailPage({
  params,
  searchParams,
}: {
  params: { semana: string };
  searchParams: { faixa?: FaixaEtariaId };
}) {
  const supabase = createClient();

  const { data: cardapios } = await supabase
    .from("cardapios_padrao")
    .select("*, cardapio_refeicoes(*)")
    .eq("semana_inicio", params.semana);

  if (!cardapios || cardapios.length === 0) notFound();

  return (
    <SemanaClient
      semana={params.semana}
      faixaInicial={searchParams.faixa ?? "bercario_2_multi"}
      cardapios={cardapios as any}
    />
  );
}
