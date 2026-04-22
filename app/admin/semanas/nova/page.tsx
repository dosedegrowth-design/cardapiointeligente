"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMondayOfWeek, getFridayOfWeek, toISODate, formatWeekRange } from "@/lib/utils";
import { toast } from "sonner";

function getNextNWeeks(n: number) {
  const weeks = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const monday = getMondayOfWeek(new Date(today.getTime() + i * 7 * 86400000));
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
  const weeks = getNextNWeeks(8);

  async function handleGenerate() {
    setLoading(true);
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
      toast.success("Cardápio gerado com sucesso!", {
        description: "Agora é só revisar e publicar.",
      });
      router.push(`/admin/semanas/${selectedWeek}`);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    } finally {
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
          Escolha a semana. A IA vai buscar a referência da prefeitura,
          cruzar com as listas de compras enviadas e gerar 3 cardápios
          (um por faixa etária).
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
                onClick={() => setSelectedWeek(monday)}
                className={`p-3 rounded-xl text-sm font-medium border transition ${
                  selectedWeek === monday
                    ? "bg-brand-primary text-white border-brand-primary shadow"
                    : "bg-white border-brand-dark/10 hover:border-brand-primary/40 text-brand-dark"
                }`}
              >
                {formatWeekRange(monday, friday)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-pastel-mint/60 to-pastel-butter/60 border-0">
        <CardContent className="p-5 text-sm text-brand-dark/80 leading-relaxed">
          <Sparkles className="w-5 h-5 text-brand-secondary mb-2" />
          <p className="font-medium text-brand-dark mb-1">Como funciona</p>
          <ol className="list-decimal list-inside space-y-1 text-brand-dark/70">
            <li>IA busca referência do mês correspondente na biblioteca</li>
            <li>Gera os 3 cardápios (berçário I 0-5m, 6-11m e berçário II)</li>
            <li>Para cada unidade com lista de compras, faz substituições</li>
            <li>Você revisa, ajusta se quiser, e publica</li>
          </ol>
        </CardContent>
      </Card>

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
    </div>
  );
}
