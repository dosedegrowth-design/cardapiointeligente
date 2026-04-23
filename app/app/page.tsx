import Link from "next/link";
import { Download, FileText, ShoppingCart, Sparkles } from "lucide-react";
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
    .select("unidade_id, unidades(id, nome, cor_primaria, faixas_atendidas)")
    .eq("id", user!.id)
    .single();

  const unidade = usuario?.unidades as any;
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

  const { data: listaSemana } = await supabase
    .from("listas_compras")
    .select("id, enviada_em")
    .eq("unidade_id", usuario?.unidade_id ?? "")
    .eq("semana_inicio", mondayISO)
    .maybeSingle();

  const temCardapios = (cardapiosSemana?.length ?? 0) > 0;

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark">
          Olá, {unidade?.nome ?? "sua unidade"} 👋
        </h1>
        <p className="text-brand-dark/60 mt-1">
          Semana atual: {formatWeekRange(mondayISO, fridayISO)}
        </p>
      </div>

      {!listaSemana ? (
        <Card className="bg-gradient-to-br from-brand-secondary to-pastel-sage text-white border-0 overflow-hidden relative">
          <CardContent className="p-6 flex items-center justify-between gap-6 flex-wrap relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80 mb-1">
                  Passo 1 de 2
                </div>
                <h3 className="font-serif text-xl font-bold mb-1">
                  Envie a lista de compras
                </h3>
                <p className="text-sm text-white/80 max-w-md">
                  Assim que mandar, a IA personaliza o cardápio pra sua
                  unidade com os itens que você comprou.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="bg-white text-brand-secondary hover:bg-white/90 shadow-lg"
            >
              <Link href="/app/lista-compras">Enviar agora →</Link>
            </Button>
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
                Lista enviada! Seu cardápio está pronto pra baixar.
              </div>
              <div className="text-xs text-brand-dark/60">
                Enviada em{" "}
                {new Date(listaSemana.enviada_em).toLocaleString("pt-BR")}
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/lista-compras">Ver lista</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-bold text-brand-dark">
            Cardápios desta semana
          </h2>
          {temCardapios && (
            <Button size="sm" asChild>
              <Link href={`/api/pdf?semana=${mondayISO}`} target="_blank">
                <Download className="w-4 h-4" />
                Baixar todos em PDF
              </Link>
            </Button>
          )}
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
                            Visualizar
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
                        Aguardando publicação pela nutricionista
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
