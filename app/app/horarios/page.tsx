"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Soup,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const REFEICOES = [
  { id: "desjejum", nome: "Desjejum", icon: Coffee, color: "bg-rose-100 text-rose-700" },
  { id: "colacao", nome: "Colação", icon: Apple, color: "bg-amber-100 text-amber-700" },
  { id: "almoco", nome: "Almoço", icon: UtensilsCrossed, color: "bg-emerald-100 text-emerald-700" },
  { id: "lanche", nome: "Lanche", icon: Cookie, color: "bg-orange-100 text-orange-700" },
  { id: "tarde", nome: "Refeição da tarde", icon: Soup, color: "bg-violet-100 text-violet-700" },
];

interface Horarios {
  desjejum: string;
  colacao: string;
  almoco: string;
  lanche: string;
  tarde: string;
}

export default function HorariosPage() {
  const router = useRouter();
  const [horarios, setHorarios] = useState<Horarios>({
    desjejum: "07h30",
    colacao: "09h00",
    almoco: "10h45",
    lanche: "13h30",
    tarde: "14h45",
  });
  const [padrao, setPadrao] = useState<Horarios | null>(null);
  const [unidadeNome, setUnidadeNome] = useState("");
  const [customizado, setCustomizado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/unidades/horarios")
      .then((r) => r.json())
      .then((d) => {
        if (d.horarios) setHorarios(d.horarios);
        if (d.padrao) setPadrao(d.padrao);
        setCustomizado(!!d.customizado);
        setUnidadeNome(d.unidade_nome ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof Horarios, valor: string) {
    setHorarios({ ...horarios, [key]: valor });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/unidades/horarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horarios }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      setCustomizado(true);
      toast.success("Horários salvos! ✅");
      router.refresh();
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Voltar pros horários padrão? Suas customizações serão removidas."))
      return;
    setSaving(true);
    try {
      const res = await fetch("/api/unidades/horarios", { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
      if (padrao) setHorarios(padrao);
      setCustomizado(false);
      toast.success("Voltou pro padrão");
    } catch (err: any) {
      toast.error("Erro");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 hover:text-brand-primary transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="inline-flex w-14 h-14 rounded-2xl bg-brand-primary items-center justify-center shadow-lg shadow-brand-primary/30 mb-3"
        >
          <Clock className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark mb-1">
          Horários das refeições
        </h1>
        <p className="text-brand-dark/60 max-w-md mx-auto text-sm">
          Personalize os horários só pra <strong>{unidadeNome || "sua unidade"}</strong>.
          Aparecem no cardápio e no PDF.
          {customizado && (
            <span className="block mt-2 text-emerald-700 text-xs">
              ✓ Você está usando horários customizados
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          {REFEICOES.map((ref) => {
            const Icon = ref.icon;
            return (
              <div
                key={ref.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-brand-light/40 transition"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${ref.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-brand-dark text-sm">
                    {ref.nome}
                  </div>
                </div>
                <input
                  type="text"
                  value={horarios[ref.id as keyof Horarios] ?? ""}
                  onChange={(e) =>
                    update(ref.id as keyof Horarios, e.target.value)
                  }
                  placeholder="Ex: 07h30"
                  className="w-28 px-3 py-2 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none text-sm text-center font-mono"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="bg-pastel-mint/40 rounded-2xl p-4 text-sm text-brand-dark/70">
        💡 <strong>Dica:</strong> Use formato livre, ex: <code className="bg-white/60 px-1 rounded">07h30</code>,{" "}
        <code className="bg-white/60 px-1 rounded">8h</code> ou{" "}
        <code className="bg-white/60 px-1 rounded">10:45</code>. Se sua semana
        for diferente, dá pra mudar em segundos!
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {customizado && (
          <Button variant="ghost" onClick={handleReset} disabled={saving}>
            <RotateCcw className="w-4 h-4" />
            Voltar ao padrão
          </Button>
        )}
        <div className="flex-1" />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar horários
        </Button>
      </div>
    </div>
  );
}
