import Link from "next/link";
import { Calendar, Download, FileText, ShoppingCart, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange, getMondayOfWeek, toISODate } from "@/lib/utils";
import { FAIXAS_ETARIAS } from "@/lib/constants";

export default async function UnidadeDashboard() {
  const supabase = createClient();
  const mondayISO = toISODate(getMondayOfWeek());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("unidade_id, unidades(nome, slug, cor_primaria, faixas_atendidas)")
    .eq("id", user!.id)
    .single();

  const unidade = usuario?.unidades as any;
  const faixasAtendidas: string[] = unidade?.faixas_atendidas ?? [];

  // Cardápios publicados desta semana (nas faixas que a unidade atende)
  const { data: cardapiosSemana } = await supabase
    .from("cardapios_padrao")
    .select("*")
    .eq("semana_inicio", mondayISO)
    .eq("status", "publicado")
    .in("faixa_etaria", faixasAtendidas);

  // Lista de compras desta semana já enviada?
  const { data: listaSemana } = await supabase
    .from("listas_compras")
    .select("id, enviada_em")
    .eq("unidade_id", usuario?.unidade_id)
    .eq("semana_inicio", mondayISO)
    .maybeSingle();

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero unidade */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-dark">
            {unidade?.nome ?? "Sua unidade"}
          </h1>
          <p className="text-brand-dark/60 mt-1">
            Semana de {formatWeekRange(mondayISO, toISODate(new Date(new Date(mondayISO).getTime() + 4 * 86400000)))}
          </p>
        </div>
      </div>

      {/* Call de ação lista de compras */}
      {!listaSemana ? (
        <Card className="bg-gradient-to-br from-brand-secondary to-pastel-sage text-white border-0">
          <CardContent className="p-6 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-1">
                  Envie a lista de compras da semana
                </h3>
                <p className="text-sm text-white/80 max-w-md">
                  Depois de enviar, a IA ajusta o cardápio padrão com base
                  nos itens que você comprou (ou não comprou).
                </p>
              </div>
            </div>
            <Button variant="secondary" asChild className="bg-white text-brand-secondary hover:bg-white/90">
              <Link href={`/app/semana/${mondayISO}/lista-compras`}>
                Enviar lista
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-pastel-mint to-pastel-butter border-0">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-secondary" />
            </div>
            <div>
              <div className="font-medium text-brand-dark text-sm">
                Lista enviada! A IA já ajustou seu cardápio.
              </div>
              <div className="text-xs text-brand-dark/60">
                Você pode editar manualmente ou baixar o PDF abaixo.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cardápios por faixa etária */}
      <div>
        <h2 className="font-serif text-xl font-bold text-brand-dark mb-4">
          Cardápios da semana
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {FAIXAS_ETARIAS.filter((f) => faixasAtendidas.includes(f.id)).map((faixa) => {
            const cardapio = cardapiosSemana?.find((c: any) => c.faixa_etaria === faixa.id);
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
                        <Link href={`/app/semana/${mondayISO}?faixa=${faixa.id}`}>
                          <FileText className="w-4 h-4" />
                          Visualizar
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <Link href={`/app/semana/${mondayISO}/pdf?faixa=${faixa.id}`}>
                          <Download className="w-4 h-4" />
                          Baixar PDF
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-brand-dark/50 py-3 text-center">
                      Aguardando publicação
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Histórico curto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Semanas anteriores</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/historico">Ver histórico</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-brand-dark/60 py-6 justify-center">
            <Calendar className="w-4 h-4" />
            Seu histórico aparecerá aqui após a primeira semana.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
