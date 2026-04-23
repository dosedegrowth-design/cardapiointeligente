"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getMondayOfWeek,
  getFridayOfWeek,
  toISODate,
  formatWeekRange,
} from "@/lib/utils";
import { FAIXAS_ETARIAS } from "@/lib/constants";
import { toast } from "sonner";

function getNextNWeeks(n: number) {
  const weeks = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const monday = getMondayOfWeek(
      new Date(today.getTime() + i * 7 * 86400000)
    );
    const friday = getFridayOfWeek(monday);
    weeks.push({ monday: toISODate(monday), friday: toISODate(friday) });
  }
  return weeks;
}

export default function NovaSemanaPage() {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState<string>(
    toISODate(getMondayOfWeek(new Date(Date.now() + 7 * 86400000)))
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const weeks = getNextNWeeks(8);

  async function handleGenerate() {
    setLoading(true);
    setDone(false);
    try {
      const res = await fetch("/api/cardapios/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana_inicio: selectedWeek }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Erro ao gerar cardápio");
      }
      setDone(true);
      toast.success("Cardápio gerado!", {
        description: "Revisando em 2 segundos...",
      });
      setTimeout(() => {
        router.push(`/admin/semanas/${selectedWeek}`);
      }, 1500);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <Link
        href="/admin/semanas"
        className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 hover:text-brand-primary transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div className="text-center py-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring" }}
          className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-pastel-coral items-center justify-center shadow-xl shadow-brand-primary/30 mb-4"
        >
          <Wand2 className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark mb-2">
          Gerar cardápio com IA
        </h1>
        <p className="text-brand-dark/60 max-w-md mx-auto">
          Escolha a semana. A IA vai gerar 3 cardápios completos (um por faixa
          etária) em ~15 segundos.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <label className="block text-sm font-medium text-brand-dark mb-3">
            Selecione a semana
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {weeks.map(({ monday, friday }) => (
              <button
                key={monday}
                disabled={loading}
                onClick={() => setSelectedWeek(monday)}
                className={`p-3 rounded-xl text-sm font-medium border transition ${
                  selectedWeek === monday
                    ? "bg-brand-primary text-white border-brand-primary shadow"
                    : "bg-white border-brand-dark/10 hover:border-brand-primary/40 text-brand-dark"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {formatWeekRange(monday, friday)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {!loading && !done ? (
          <motion.div
            key="info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-gradient-to-br from-pastel-mint/60 to-pastel-butter/60 border-0">
              <CardContent className="p-5 text-sm text-brand-dark/80 leading-relaxed">
                <Sparkles className="w-5 h-5 text-brand-secondary mb-2" />
                <p className="font-medium text-brand-dark mb-2">Como funciona</p>
                <ol className="list-decimal list-inside space-y-1 text-brand-dark/70">
                  <li>IA gera os 3 cardápios (Berçário I 0-5m, 6-11m e Berçário II)</li>
                  <li>Grava em rascunho no banco</li>
                  <li>Você revisa cada célula</li>
                  <li>Clica "Publicar" e as unidades já podem baixar</li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  )}
                  <div>
                    <div className="font-medium text-brand-dark">
                      {done
                        ? "Cardápio pronto!"
                        : "Gerando cardápios com IA..."}
                    </div>
                    <div className="text-xs text-brand-dark/50">
                      {done
                        ? "Redirecionando..."
                        : "Isso leva entre 10 e 20 segundos"}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {FAIXAS_ETARIAS.map((f, i) => (
                    <FaixaProgress
                      key={f.id}
                      label={`${f.nome} · ${f.idade}`}
                      delay={i * 3000}
                      done={done}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!done && (
        <div className="flex justify-end">
          <Button size="lg" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar cardápio
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function FaixaProgress({
  label,
  delay,
  done,
}: {
  label: string;
  delay: number;
  done: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={done ? { opacity: 1 } : { opacity: [0.4, 1, 0.4] }}
      transition={{
        duration: 2,
        repeat: done ? 0 : Infinity,
        delay: delay / 1000,
      }}
      className="flex items-center gap-2 text-sm text-brand-dark/70"
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
      )}
      {label}
    </motion.div>
  );
}
