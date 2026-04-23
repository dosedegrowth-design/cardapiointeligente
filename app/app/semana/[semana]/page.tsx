import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardapioGrid,
  type CardapioCell,
} from "@/components/cardapio/cardapio-grid";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange } from "@/lib/utils";
import { FAIXAS_ETARIAS, type FaixaEtariaId, type RefeicaoId } from "@/lib/constants";

export default async function UnidadeSemanaPage({
  params,
  searchParams,
}: {
  params: { semana: string };
  searchParams: { faixa?: FaixaEtariaId };
}) {
  const supabase = createClient();
  const faixa: FaixaEtariaId = searchParams.faixa ?? "bercario_2_multi";

  const { data: cardapios } = await supabase
    .from("cardapios_padrao")
    .select("*, cardapio_refeicoes(*)")
    .eq("semana_inicio", params.semana)
    .eq("status", "publicado");

  if (!cardapios || cardapios.length === 0) notFound();

  const cardapio = cardapios.find((c: any) => c.faixa_etaria === faixa);
  const faixaInfo = FAIXAS_ETARIAS.find((f) => f.id === faixa);

  const grid: Record<number, Partial<Record<RefeicaoId, CardapioCell>>> = {};
  (cardapio?.cardapio_refeicoes ?? []).forEach((r: any) => {
    if (!grid[r.dia]) grid[r.dia] = {};
    grid[r.dia][r.refeicao as RefeicaoId] = {
      descricao: r.descricao,
      especial: r.especial,
      feriado_nome: r.feriado_nome,
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 hover:text-brand-primary transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-dark">
              {formatWeekRange(params.semana, cardapio?.semana_fim ?? params.semana)}
            </h1>
            <p className="text-brand-dark/60 mt-1">
              {faixaInfo?.nome} · {faixaInfo?.idade}
            </p>
          </div>
          {cardapio && (
            <Button asChild>
              <Link
                href={`/api/pdf?semana=${params.semana}&faixa=${faixa}`}
                target="_blank"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {FAIXAS_ETARIAS.map((f) => {
          const c = cardapios.find((x: any) => x.faixa_etaria === f.id);
          const active = f.id === faixa;
          return (
            <Link
              key={f.id}
              href={`/app/semana/${params.semana}?faixa=${f.id}`}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                active
                  ? "bg-brand-primary text-white shadow-md"
                  : c
                    ? "bg-white text-brand-dark hover:bg-brand-light border border-brand-dark/10"
                    : "bg-zinc-50 text-brand-dark/40 border border-brand-dark/5"
              }`}
            >
              {f.nome} · {f.idade}
            </Link>
          );
        })}
      </div>

      {cardapio ? (
        <CardapioGrid grid={grid} />
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-brand-dark/60">
          Cardápio não publicado para esta faixa etária.
        </div>
      )}
    </div>
  );
}
