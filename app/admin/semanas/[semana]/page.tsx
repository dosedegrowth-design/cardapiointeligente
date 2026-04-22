import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardapioGrid, type CardapioCell } from "@/components/cardapio/cardapio-grid";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange } from "@/lib/utils";
import { FAIXAS_ETARIAS, type FaixaEtariaId, type RefeicaoId } from "@/lib/constants";

export default async function SemanaDetailPage({
  params,
  searchParams,
}: {
  params: { semana: string };
  searchParams: { faixa?: FaixaEtariaId };
}) {
  const supabase = createClient();

  const faixaAtual: FaixaEtariaId =
    searchParams.faixa ?? "bercario_2_multi";

  const { data: cardapios } = await supabase
    .from("cardapios_padrao")
    .select("*, cardapio_refeicoes(*)")
    .eq("semana_inicio", params.semana);

  if (!cardapios || cardapios.length === 0) notFound();

  const cardapioAtual = cardapios.find(
    (c: any) => c.faixa_etaria === faixaAtual
  );

  const faixaInfo = FAIXAS_ETARIAS.find((f) => f.id === faixaAtual);

  // Monta grid
  const grid: Record<number, Partial<Record<RefeicaoId, CardapioCell>>> = {};
  (cardapioAtual?.cardapio_refeicoes ?? []).forEach((r: any) => {
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
          href="/admin/semanas"
          className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 hover:text-brand-primary transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-dark">
              Semana de {formatWeekRange(params.semana, cardapioAtual?.semana_fim ?? params.semana)}
            </h1>
            <p className="text-brand-dark/60 mt-1">
              {cardapioAtual?.gerado_por === "ia" ? (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Gerado com IA
                </span>
              ) : (
                "Criado manualmente"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cardapioAtual?.status !== "publicado" && (
              <Button variant="default">
                <CheckCircle2 className="w-4 h-4" />
                Publicar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs faixas etárias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {FAIXAS_ETARIAS.map((faixa) => {
          const c = cardapios.find((x: any) => x.faixa_etaria === faixa.id);
          const active = faixa.id === faixaAtual;
          return (
            <Link
              key={faixa.id}
              href={`/admin/semanas/${params.semana}?faixa=${faixa.id}`}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                active
                  ? "bg-brand-primary text-white shadow-md"
                  : c
                    ? "bg-white text-brand-dark hover:bg-brand-light border border-brand-dark/10"
                    : "bg-zinc-50 text-brand-dark/40 border border-brand-dark/5"
              }`}
            >
              {faixa.nome} · {faixa.idade}
            </Link>
          );
        })}
      </div>

      {cardapioAtual ? (
        <CardapioGrid grid={grid} editable />
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-brand-dark/60 mb-4">
              Cardápio para <strong>{faixaInfo?.nome} {faixaInfo?.idade}</strong> ainda não foi gerado.
            </p>
            <Button>
              <Sparkles className="w-4 h-4" />
              Gerar com IA
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
