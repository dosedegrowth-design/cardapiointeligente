import Link from "next/link";
import { Download, FileText, Sparkles, AlertCircle, Calendar } from "lucide-react";
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

  // Busca TODAS as semanas publicadas a partir de hoje (atual + futuras)
  const { data: publicados } = await supabase
    .from("cardapios_padrao")
    .select("id, semana_inicio, semana_fim, faixa_etaria, status")
    .eq("status", "publicado")
    .gte("semana_inicio", mondayISO)
    .order("semana_inicio", { ascending: true });

  // Agrupa por semana_inicio
  const semanasMap = new Map<
    string,
    { semana_inicio: string; semana_fim: string; cardapios: any[] }
  >();
  for (const c of (publicados ?? []) as any[]) {
    if (!semanasMap.has(c.semana_inicio)) {
      semanasMap.set(c.semana_inicio, {
        semana_inicio: c.semana_inicio,
        semana_fim: c.semana_fim,
        cardapios: [],
      });
    }
    semanasMap.get(c.semana_inicio)!.cardapios.push(c);
  }
  const semanas = Array.from(semanasMap.values());

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark">
          Olá, {unidade?.nome ?? (isSuperAdmin ? "admin (visualizando)" : "sua unidade")} 👋
        </h1>
        <p className="text-brand-dark/60 mt-1">
          Hoje: {formatWeekRange(mondayISO, fridayISO)}
        </p>
      </div>

      {semanas.length === 0 ? (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-amber-900">
                Nenhum cardápio publicado ainda
              </div>
              <div className="text-xs text-amber-800/80">
                A nutricionista ainda vai publicar o cardápio.
                Você receberá acesso assim que disponível.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Lista de semanas publicadas */}
          {semanas.map((sem, idx) => {
            const isAtual = sem.semana_inicio === mondayISO;
            return (
              <section key={sem.semana_inicio}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand-dark/50 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {isAtual ? "Semana atual" : idx === 0 ? "Próxima semana" : "Semana futura"}
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-brand-dark">
                      {formatWeekRange(sem.semana_inicio, sem.semana_fim)}
                    </h2>
                  </div>
                  <Button asChild>
                    <Link
                      href={`/api/pdf?semana=${sem.semana_inicio}`}
                      target="_blank"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF (3 faixas)
                    </Link>
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {FAIXAS_ETARIAS.filter((f) => faixasAtendidas.includes(f.id)).map(
                    (faixa) => {
                      const cardapio = sem.cardapios.find(
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
                                    href={`/app/semana/${sem.semana_inicio}?faixa=${faixa.id}`}
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
                                    href={`/api/pdf?semana=${sem.semana_inicio}&faixa=${faixa.id}`}
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
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
