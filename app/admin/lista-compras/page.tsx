"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Plus,
  ShoppingCart,
  Trash2,
  Sparkles,
  FileText,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getMondayOfWeek,
  getFridayOfWeek,
  toISODate,
  formatWeekRange,
} from "@/lib/utils";

interface Item {
  quantidade: string;
  unidade: string;
  item: string;
}

const UNIDADES = ["un", "kg", "g", "L", "mL", "cx", "pct", "cartela", "saco", "maço"];

function parseBulkText(text: string): Item[] {
  const lines = text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter((l) => l && l !== "*");

  return lines
    .map((line) => {
      const clean = line.replace(/^[\*\-\•\·]\s*/, "").trim();
      if (!clean) return null;
      const match = clean.match(
        /^([\d½¼¾⅓⅔\.\,\/]+)\s*(un|kg|k|g|l|ml|cx|cartela|pct|saco|maço|caixa)?\s+(?:de\s+)?(.+)$/i
      );
      if (match) {
        let qtd = match[1]
          .replace("½", "0.5")
          .replace("¼", "0.25")
          .replace("¾", "0.75")
          .replace("⅓", "0.33")
          .replace("⅔", "0.66")
          .replace("1/2", "0.5")
          .replace(",", ".");
        let un = (match[2] ?? "un").toLowerCase();
        if (un === "k") un = "kg";
        if (un === "caixa") un = "cx";
        return { quantidade: qtd, unidade: un, item: match[3].trim() };
      }
      return { quantidade: "1", unidade: "un", item: clean };
    })
    .filter(Boolean) as Item[];
}

function getNextNWeeks(n: number) {
  const weeks = [];
  const today = new Date();
  for (let i = -1; i < n; i++) {
    const monday = getMondayOfWeek(
      new Date(today.getTime() + i * 7 * 86400000)
    );
    const friday = getFridayOfWeek(monday);
    weeks.push({ monday: toISODate(monday), friday: toISODate(friday) });
  }
  return weeks;
}

export default function ListaComprasPage() {
  const router = useRouter();
  const [semana, setSemana] = useState<string>(
    toISODate(getMondayOfWeek())
  );
  const [itens, setItens] = useState<Item[]>([
    { quantidade: "", unidade: "un", item: "" },
  ]);
  const [bulkText, setBulkText] = useState("");
  const [mode, setMode] = useState<"bulk" | "manual">("bulk");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const weeks = getNextNWeeks(8);

  useEffect(() => {
    setFetching(true);
    fetch(`/api/listas-compras?semana=${semana}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.itens && d.itens.length) {
          setItens(d.itens);
          setMode("manual");
        } else {
          setItens([{ quantidade: "", unidade: "un", item: "" }]);
        }
      })
      .finally(() => setFetching(false));
  }, [semana]);

  function addItem() {
    setItens([...itens, { quantidade: "", unidade: "un", item: "" }]);
  }
  function updateItem(i: number, field: keyof Item, value: string) {
    const novos = [...itens];
    novos[i] = { ...novos[i], [field]: value };
    setItens(novos);
  }
  function removeItem(i: number) {
    setItens(itens.filter((_, idx) => idx !== i));
  }

  function handleImportBulk() {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      toast.error("Não detectei itens", {
        description: "Use 1 item por linha",
      });
      return;
    }
    setItens(parsed);
    setMode("manual");
    toast.success(`${parsed.length} itens detectados!`);
  }

  async function handleSubmit() {
    const filtrados = itens.filter((i) => i.item.trim());
    if (filtrados.length === 0) {
      toast.error("Adicione ao menos 1 item");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/listas-compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semana_inicio: semana,
          itens: filtrados,
          global: true,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      toast.success("Lista salva!", {
        description: `${filtrados.length} itens pra semana de ${semana}.`,
      });
      router.push(`/admin/semanas/nova?semana=${semana}`);
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <Link
        href="/admin"
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
          className="inline-flex w-14 h-14 rounded-2xl bg-brand-secondary items-center justify-center shadow-lg shadow-brand-secondary/30 mb-3"
        >
          <ShoppingCart className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark mb-2">
          Lista de compras da semana
        </h1>
        <p className="text-brand-dark/60 max-w-md mx-auto">
          Esta lista é a base que a IA usa pra gerar o cardápio de TODAS as
          unidades. Cole aqui o que foi comprado na semana.
        </p>
      </div>

      {/* Seletor semana */}
      <Card>
        <CardContent className="p-5">
          <label className="block text-sm font-medium text-brand-dark mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Semana
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {weeks.map(({ monday, friday }) => (
              <button
                key={monday}
                onClick={() => setSemana(monday)}
                className={`p-2.5 rounded-xl text-sm font-medium border transition ${
                  semana === monday
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

      {fetching ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
        </div>
      ) : (
        <>
          {/* Tabs modo */}
          <div className="flex items-center gap-2 p-1 bg-brand-light rounded-xl w-fit mx-auto">
            <button
              onClick={() => setMode("bulk")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                mode === "bulk"
                  ? "bg-white text-brand-dark shadow-sm"
                  : "text-brand-dark/60"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Colar texto
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                mode === "manual"
                  ? "bg-white text-brand-dark shadow-sm"
                  : "text-brand-dark/60"
              }`}
            >
              Lista estruturada
            </button>
          </div>

          {mode === "bulk" ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">
                    Cole aqui a lista (1 item por linha)
                  </label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`* 1/2 cx de maçã
* 1 cx de Banana
* 2 kg de chuchu
* 3 cartelas de ovos`}
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none text-sm leading-relaxed font-mono"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleImportBulk}
                  disabled={!bulkText.trim()}
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4" />
                  Interpretar e continuar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-3">
                {itens.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Qtd"
                      value={item.quantidade}
                      onChange={(e) =>
                        updateItem(i, "quantidade", e.target.value)
                      }
                      className="w-20 px-3 py-2.5 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none text-sm"
                    />
                    <select
                      value={item.unidade}
                      onChange={(e) =>
                        updateItem(i, "unidade", e.target.value)
                      }
                      className="w-24 px-3 py-2.5 rounded-xl border border-brand-dark/15 focus:border-brand-primary outline-none text-sm bg-white"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Item (ex: banana)"
                      value={item.item}
                      onChange={(e) => updateItem(i, "item", e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none text-sm"
                    />
                    <button
                      onClick={() => removeItem(i)}
                      className="p-2 text-brand-dark/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar item
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-brand-dark/50">
              {mode === "manual"
                ? `${itens.filter((i) => i.item.trim()).length} itens salvos`
                : "Interprete a lista pra editar antes de salvar"}
            </p>
            {mode === "manual" && (
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  itens.filter((i) => i.item.trim()).length === 0
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar e ir para geração de IA
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
