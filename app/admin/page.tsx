import Link from "next/link";
import { Calendar, CheckCircle2, Clock, Sparkles, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange, getMondayOfWeek, toISODate } from "@/lib/utils";
import { FAIXAS_ETARIAS } from "@/lib/constants";

export default async function AdminDashboard() {
  const supabase = createClient();
  const mondayThisWeek = toISODate(getMondayOfWeek());

  const [
    { count: unidadesCount },
    { count: cardapiosPublicados },
    { count: listasEnviadas },
    { data: proximosCardapios },
  ] = await Promise.all([
    supabase.from("unidades").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase
      .from("cardapios_padrao")
      .select("*", { count: "exact", head: true })
      .eq("status", "publicado"),
    supabase
      .from("listas_compras")
      .select("*", { count: "exact", head: true })
      .eq("semana_inicio", mondayThisWeek),
    supabase
      .from("cardapios_padrao")
      .select("*")
      .gte("semana_inicio", mondayThisWeek)
      .order("semana_inicio", { ascending: true })
      .limit(6),
  ]);

  const stats = [
    {
      label: "Unidades ativas",
      value: unidadesCount ?? 0,
      icon: Users,
      color: "bg-pastel-sky text-sky-700",
      href: "/admin/unidades",
    },
    {
      label: "Cardápios publicados",
      value: cardapiosPublicados ?? 0,
      icon: CheckCircle2,
      color: "bg-pastel-mint text-emerald-700",
      href: "/admin/semanas",
    },
    {
      label: "Listas esta semana",
      value: listasEnviadas ?? 0,
      icon: Clock,
      color: "bg-pastel-butter text-amber-700",
      href: "/admin/semanas",
    },
    {
      label: "Substituições IA",
      value: 0,
      icon: Sparkles,
      color: "bg-pastel-rose text-rose-700",
      href: "/admin/semanas",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-dark">
            Bem-vinda, nutricionista
          </h1>
          <p className="text-brand-dark/60 mt-1">
            Aqui você acompanha tudo que está rolando nas unidades.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/semanas/nova">
            <Sparkles className="w-4 h-4" />
            Gerar cardápio com IA
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-3xl font-serif font-bold text-brand-dark">
                  {value}
                </div>
                <div className="text-sm text-brand-dark/60">{label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Próximos cardápios</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/semanas">Ver todos</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {proximosCardapios && proximosCardapios.length > 0 ? (
                proximosCardapios.map((c: any) => {
                  const faixa = FAIXAS_ETARIAS.find((f) => f.id === c.faixa_etaria);
                  return (
                    <Link
                      key={c.id}
                      href={`/admin/semanas/${c.semana_inicio}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-light/60 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-${faixa?.cor} flex items-center justify-center`}>
                          <Calendar className="w-5 h-5 text-brand-dark/70" />
                        </div>
                        <div>
                          <div className="font-medium text-brand-dark text-sm">
                            {formatWeekRange(c.semana_inicio, c.semana_fim)}
                          </div>
                          <div className="text-xs text-brand-dark/50">
                            {faixa?.nome} · {faixa?.idade}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  );
                })
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-br from-brand-primary to-pastel-coral text-white">
          <CardContent className="p-6">
            <Sparkles className="w-8 h-8 mb-3 opacity-90" />
            <h3 className="font-serif text-xl font-bold mb-2">
              Gere com IA
            </h3>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Deixe a IA criar o cardápio da próxima semana baseado na
              referência da prefeitura + listas de compras enviadas.
            </p>
            <Button variant="secondary" size="sm" asChild className="bg-white text-brand-primary hover:bg-white/90">
              <Link href="/admin/semanas/nova">
                Gerar agora
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Rascunho", className: "bg-zinc-100 text-zinc-700" },
    em_revisao: { label: "Em revisão", className: "bg-amber-100 text-amber-700" },
    aprovado: { label: "Aprovado", className: "bg-sky-100 text-sky-700" },
    publicado: { label: "Publicado", className: "bg-emerald-100 text-emerald-700" },
    arquivado: { label: "Arquivado", className: "bg-zinc-100 text-zinc-500" },
  };
  const m = map[status] ?? map.draft;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${m.className}`}>{m.label}</span>;
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-light flex items-center justify-center mb-3">
        <TrendingUp className="w-6 h-6 text-brand-dark/40" />
      </div>
      <p className="text-sm text-brand-dark/60 mb-3">
        Nenhum cardápio ainda.
      </p>
      <Button size="sm" asChild>
        <Link href="/admin/semanas/nova">
          <Sparkles className="w-4 h-4" />
          Gerar primeiro
        </Link>
      </Button>
    </div>
  );
}
