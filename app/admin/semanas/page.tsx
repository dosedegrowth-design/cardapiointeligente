import Link from "next/link";
import { Calendar, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange } from "@/lib/utils";
import { FAIXAS_ETARIAS } from "@/lib/constants";

export default async function SemanasPage() {
  const supabase = createClient();

  const { data: cardapios } = await supabase
    .from("cardapios_padrao")
    .select("*")
    .order("semana_inicio", { ascending: false })
    .limit(100);

  // Agrupar por semana_inicio
  const semanas = new Map<string, any[]>();
  (cardapios ?? []).forEach((c: any) => {
    const key = c.semana_inicio;
    if (!semanas.has(key)) semanas.set(key, []);
    semanas.get(key)!.push(c);
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-dark">
            Cardápios semanais
          </h1>
          <p className="text-brand-dark/60 mt-1">
            Todos os cardápios publicados e em produção.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/semanas/nova">
            <Sparkles className="w-4 h-4" />
            Gerar com IA
          </Link>
        </Button>
      </div>

      {semanas.size === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-10 h-10 mx-auto text-brand-dark/20 mb-3" />
            <p className="text-brand-dark/60 mb-4">
              Nenhum cardápio ainda. Comece gerando com IA.
            </p>
            <Button asChild>
              <Link href="/admin/semanas/nova">
                <Sparkles className="w-4 h-4" />
                Gerar primeiro cardápio
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Array.from(semanas.entries()).map(([semana, items]) => {
            const fim = items[0]?.semana_fim;
            return (
              <Card key={semana} className="hover:shadow-md transition">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <div className="font-serif text-lg font-bold text-brand-dark">
                        {formatWeekRange(semana, fim)}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {FAIXAS_ETARIAS.map((faixa) => {
                          const c = items.find((i: any) => i.faixa_etaria === faixa.id);
                          return (
                            <div
                              key={faixa.id}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                c
                                  ? c.status === "publicado"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {faixa.idade} · {c?.status ?? "não gerado"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/semanas/${semana}`}>Abrir</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
