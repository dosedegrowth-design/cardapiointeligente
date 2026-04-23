import Link from "next/link";
import { Download, FileText, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  formatWeekRange,
  getMondayOfWeek,
  getFridayOfWeek,
  toISODate,
} from "@/lib/utils";
import { FAIXAS_ETARIAS } from "@/lib/constants";

export default async function UnidadeDashboard() {
  const supabase = createClient();
  const monday = getMondayOfWeek();
  const friday = getFridayOfWeek(monday);
  const mondayISO = toISODate(monday);
  const fridayISO = toISODate(friday);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, unidade_id, unidades(id, nome, cor_primaria, faixas_atendidas)")
    .eq("id", user!.id)
    .single();

  const unidade = usuario?.unidades as any;
  const isSuperAdmin = usuario?.role === "super_admin";
  const faixasAtendidas: string[] = unidade?.faixas_atendidas ?? [
    "bercario_1_0_5m",
    "bercario_1_6_11m",
    "bercario_2_multi",
  ];

  const { data: cardapiosSemana } = await supabase
    .from("cardapios_padrao")
    .select("id, faixa_etaria, status")
    .eq("semana_inicio", mondayISO)
    .eq("status", "publicado");

  const temCardapios = (cardapiosSemana?.length ?? 0) > 0;

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark">
          Olá, {unidade?.nome ?? (isSuperAdmin ? "admin (visualizando)" : "sua unidade")} 👋
        </h1>
        <p className="text-brand-dark/60 mt-1">
          Semana atual: {formatWeekRange(mondayISO, fridayISO)}
        </p>
      </div>

      {/* Status do cardápio */}
      {!temCardapios ? (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-amber-900">
                Cardápio ainda não publicado
              </div>
              <div className="text-xs text-amber-800/80">
                A nutricionista ainda vai publicar o cardápio desta semana.
                Você receberá acesso assim que disponível.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-pastel-mint to-pastel-butter border-0">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-secondary" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-brand-dark">
                Cardápio da semana disponível! 🎉
              </div>
              <div className="text-xs text-brand-dark/60">
                Visualize, ajuste se quiser alguma refeição, e baixe o PDF
                pronto pra imprimir.
              </div>
            </div>
            <Button asChild>
              <Link href={`/api/pdf?semana=${mondayISO}`} target="_blank">
                <Download className="w-4 h-4" />
                Baixar PDF
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-bold text-brand-dark">
            Cardápios desta semana
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {FAIXAS_ETARIAS.filter((f) => faixasAtendidas.includes(f.id)).map(
            (faixa) => {
              const cardapio = cardapiosSemana?.find(
                (c: any) => c.faixa_etaria === faixa.id
              );
              return (
                <Card
                  key={faixa.id}
                  className="hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden"
                >
                  <div className={`h-2 bg-${faixa.cor}`} />
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-wider text-brand-dark/50 mb-1">
                      {faixa.nome}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-brand-dark mb-1">
                      {faixa.idade}
                    </h3>
                    <p className="text-xs text-brand-dark/60 mb-4 leading-relaxed">
                      {faixa.descricao}
                    </p>

                    {cardapio ? (
                      <div className="flex flex-col gap-2">
                        <Button size="sm" asChild className="w-full">
                          <Link
                            href={`/app/semana/${mondayISO}?faixa=${faixa.id}`}
                          >
                            <FileText className="w-4 h-4" />
                            Visualizar e ajustar
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="w-full"
                        >
                          <Link
                            href={`/api/pdf?semana=${mondayISO}&faixa=${faixa.id}`}
                            target="_blank"
                          >
                            <Download className="w-4 h-4" />
                            Baixar PDF
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-brand-dark/50 py-3 text-center bg-brand-light/50 rounded-lg">
                        Aguardando publicação
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
