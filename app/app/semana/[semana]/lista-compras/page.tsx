"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Item {
  quantidade: string;
  unidade: string;
  item: string;
}

const UNIDADES = ["un", "kg", "g", "L", "mL", "cx", "pct", "cartela", "saco"];

const SUGESTOES_INICIAIS: Item[] = [
  { quantidade: "1", unidade: "cx", item: "banana" },
  { quantidade: "", unidade: "cx", item: "" },
];

export default function ListaComprasPage({
  params,
}: {
  params: { semana: string };
}) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>(SUGESTOES_INICIAIS);
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ semana_inicio: params.semana, itens: filtrados }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error);
      }
      toast.success("Lista enviada!", {
        description: "A IA vai ajustar seu cardápio em segundos.",
      });
      router.push("/app");
    } catch (err: any) {
      toast.error("Erro", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
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
          className="inline-flex w-14 h-14 rounded-2xl bg-brand-secondary items-center justify-center shadow-lg shadow-brand-secondary/30 mb-3"
        >
          <ShoppingCart className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="font-serif text-3xl font-bold text-brand-dark mb-2">
          Lista de compras da semana
        </h1>
        <p className="text-brand-dark/60 max-w-md mx-auto">
          Cadastre os itens que você comprou. A IA vai ajustar o cardápio
          automaticamente pra usar só o que você tem em estoque.
        </p>
      </div>

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
                onChange={(e) => updateItem(i, "quantidade", e.target.value)}
                className="w-20 px-3 py-2.5 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none text-sm"
              />
              <select
                value={item.unidade}
                onChange={(e) => updateItem(i, "unidade", e.target.value)}
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-dark/50">
          {itens.filter((i) => i.item.trim()).length} itens na lista
        </p>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar lista"
          )}
        </Button>
      </div>
    </div>
  );
}
