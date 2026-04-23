import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ShoppingCart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
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

export default async function AdminDashboard() {
  const supabase = createClient();
  const monday = getMondayOfWeek();
  const friday = getFridayOfWeek(monday);
  const mondayISO = toISODate(monday);
  const fridayISO = toISODate(friday);

  // Lista da semana (global)
  const { data: listaSemana } = await supabase
    .from("listas_compras")
    .select("id, itens, enviada_em")
    .eq("semana_inicio", mondayISO)
    .is("unidade_id", null)
    .maybeSingle();

  // Cardápios desta semana
  const { data: cardapiosSemana } = await supabase
    .from("cardapios_padrao")
    .select("id, faixa_etaria, status")
    .eq("semana_inicio", mondayISO);

  const temLista = !!listaSemana;
  const temCardapio = (cardapiosSemana?.length ?? 0) > 0;
  const tudoPublicado =
    temCardapio &&
    cardapiosSemana!.every((c: any) => c.status === "publicado");

  // Próximos cardápios (não da semana atual)
  const { data: proximosCardapios } = await supabase
    .from("cardapios_padrao")
    .select("*")
    .gt("semana_inicio", mondayISO)
    .order("semana_inicio", { ascending: true })
    .limit(6);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark">
          Bem-vinda, nutricionista 👋
        </h1>
        <p className="text-brand-dark/60 mt-1">
          Semana atual: {formatWeekRange(mondayISO, fridayISO)}
        </p>
      </div>

      {/* Fluxo semanal em 3 passos */}
      <div>
        <h2 className="font-serif text-xl font-bold text-brand-dark mb-4">
          Fluxo da semana
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <StepCard
            n={1}
            title="Lista de compras"
            description="Cole aqui a lista que você comprou esta semana."
            icon={ShoppingCart}
            color="secondary"
            done={temLista}
            href="/admin/lista-compras"
            cta={temLista ? "Atualizar lista" : "Cadastrar agora →"}
            meta={
              temLista
                ? `${(listaSemana.itens as any[]).length} itens cadastrados`
                : undefined
            }
          />
          <StepCard
            n={2}
            title="Gerar cardápio"
            description="IA cria 3 cardápios usando a lista + referência da prefeitura."
            icon={Sparkles}
            color="primary"
            done={temCardapio}
            disabled={!temLista}
            href={`/admin/semanas/nova?semana=${mondayISO}`}
            cta={temCardapio ? "Regerar ou editar" : "Gerar agora →"}
            meta={temCardapio ? `${cardapiosSemana!.length}/3 criados` : undefined}
          />
          <StepCard
            n={3}
            title="Publicar"
            description="Unidades só veem quando você publica."
            icon={CheckCircle2}
            color="mint"
            done={tudoPublicado}
            disabled={!temCardapio}
            href={`/admin/semanas/${mondayISO}`}
            cta={tudoPublicado ? "Ver cardápios" : "Revisar e publicar →"}
            meta={
              temCardapio
                ? `${cardapiosSemana!.filter((c: any) => c.status === "publicado").length}/3 publicados`
                : undefined
            }
          />
        </div>
      </div>

      {/* Lista de próximas semanas */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-bold text-brand-dark">
              Próximas semanas
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/semanas">
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
          {proximosCardapios && proximosCardapios.length > 0 ? (
            <div className="space-y-2">
              {(() => {
                const grupos = new Map<string, any[]>();
                for (const c of proximosCardapios as any[]) {
                  if (!grupos.has(c.semana_inicio)) grupos.set(c.semana_inicio, []);
                  grupos.get(c.semana_inicio)!.push(c);
                }
                return Array.from(grupos.entries()).map(([semana, items]) => (
                  <Link
                    key={semana}
                    href={`/admin/semanas/${semana}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-light/60 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-brand-dark/70" />
                      </div>
                      <div>
                        <div className="font-medium text-brand-dark text-sm">
                          {formatWeekRange(semana, items[0].semana_fim)}
                        </div>
                        <div className="text-xs text-brand-dark/50">
                          {items.length} faixa{items.length > 1 ? "s" : ""}{" "}
                          etária{items.length > 1 ? "s" : ""} ·{" "}
                          {items.filter((i) => i.status === "publicado").length}/{items.length}{" "}
                          publicado
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-dark/30 group-hover:text-brand-primary transition" />
                  </Link>
                ));
              })()}
            </div>
          ) : (
            <p className="text-sm text-brand-dark/50 text-center py-8">
              Nenhuma semana futura ainda. Gere o cardápio da próxima semana acima.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepCard({
  n,
  title,
  description,
  icon: Icon,
  color,
  done,
  disabled,
  href,
  cta,
  meta,
}: {
  n: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: "primary" | "secondary" | "mint";
  done: boolean;
  disabled?: boolean;
  href: string;
  cta: string;
  meta?: string;
}) {
  const colorMap = {
    primary: {
      bg: "from-brand-primary to-pastel-coral",
      accent: "text-brand-primary bg-brand-primary/10",
    },
    secondary: {
      bg: "from-brand-secondary to-pastel-sage",
      accent: "text-brand-secondary bg-brand-secondary/10",
    },
    mint: {
      bg: "from-emerald-500 to-teal-500",
      accent: "text-emerald-600 bg-emerald-100",
    },
  };
  const c = colorMap[color];

  if (disabled) {
    return (
      <Card className="opacity-50 cursor-not-allowed">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100`}
            >
              <Icon className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="text-xs font-bold text-zinc-400">Passo {n}</div>
          </div>
          <h3 className="font-serif text-lg font-bold text-zinc-500 mb-1">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 mb-3">{description}</p>
          <div className="text-xs text-zinc-400">
            Complete o passo anterior
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={href}>
      <Card
        className={`hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full ${done ? "ring-2 ring-emerald-400" : ""}`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.accent}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-brand-dark/40">
              Passo {n}
            </div>
          </div>
          <h3 className="font-serif text-lg font-bold text-brand-dark mb-1 flex items-center gap-2">
            {title}
            {done && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </h3>
          <p className="text-xs text-brand-dark/60 mb-3">{description}</p>
          {meta && (
            <div className="text-xs text-brand-dark/70 font-medium mb-2">
              {meta}
            </div>
          )}
          <div className="text-sm font-medium text-brand-primary">{cta}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
