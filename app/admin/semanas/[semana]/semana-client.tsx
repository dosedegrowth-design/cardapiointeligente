"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  XCircle,
  Loader2,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CardapioGrid,
  type CardapioCell,
} from "@/components/cardapio/cardapio-grid";
import { FAIXAS_ETARIAS, type FaixaEtariaId, type RefeicaoId } from "@/lib/constants";
import { formatWeekRange } from "@/lib/utils";
import { toast } from "sonner";

interface RefeicaoRow {
  id: string;
  dia: number;
  refeicao: RefeicaoId;
  descricao: string | null;
  especial: "atividade_suspensa" | "feriado" | null;
  feriado_nome: string | null;
}

interface CardapioData {
  id: string;
  semana_inicio: string;
  semana_fim: string;
  faixa_etaria: FaixaEtariaId;
  status: string;
  gerado_por: "ia" | "manual";
  cardapio_refeicoes: RefeicaoRow[];
}

interface Props {
  semana: string;
  faixaInicial: FaixaEtariaId;
  cardapios: CardapioData[];
}

function buildGrid(refeicoes: RefeicaoRow[]) {
  const grid: Record<number, Partial<Record<RefeicaoId, CardapioCell>>> = {};
  for (const r of refeicoes) {
    if (!grid[r.dia]) grid[r.dia] = {};
    grid[r.dia][r.refeicao] = {
      descricao: r.descricao,
      especial: r.especial,
      feriado_nome: r.feriado_nome,
    };
  }
  return grid;
}

export function SemanaClient({ semana, faixaInicial, cardapios }: Props) {
  const router = useRouter();
  const [faixaAtual, setFaixaAtual] = useState<FaixaEtariaId>(faixaInicial);
  const [localData, setLocalData] = useState(cardapios);
  const [publishing, setPublishing] = useState(false);

  const cardapioAtual = localData.find((c) => c.faixa_etaria === faixaAtual);
  const faixaInfo = FAIXAS_ETARIAS.find((f) => f.id === faixaAtual);

  async function handleSaveRefeicao(
    dia: number,
    refeicao: RefeicaoId,
    descricao: string
  ) {
    if (!cardapioAtual) return;
    const res = await fetch(
      `/api/cardapios/${cardapioAtual.id}/refeicao`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dia, refeicao, descricao }),
      }
    );
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Erro ao salvar");
    }

    // Atualiza estado local
    setLocalData((prev) =>
      prev.map((c) => {
        if (c.id !== cardapioAtual.id) return c;
        const outras = c.cardapio_refeicoes.filter(
          (r) => !(r.dia === dia && r.refeicao === refeicao)
        );
        return {
          ...c,
          cardapio_refeicoes: [
            ...outras,
            {
              id: crypto.randomUUID(),
              dia,
              refeicao,
              descricao,
              especial: null,
              feriado_nome: null,
            },
          ],
        };
      })
    );
  }

  async function handleMarkSpecial(
    dia: number,
    tipo: "atividade_suspensa" | "feriado",
    nome?: string
  ) {
    if (!cardapioAtual) return;
    // Usa "almoco" como slot de marcação única
    const res = await fetch(
      `/api/cardapios/${cardapioAtual.id}/refeicao`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dia,
          refeicao: "almoco",
          descricao: null,
          especial: tipo,
          feriado_nome: nome ?? null,
        }),
      }
    );
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Erro");
      return;
    }
    toast.success(tipo === "feriado" ? "Feriado marcado" : "Suspenso marcado");
    router.refresh();
  }

  async function handleClearSpecial(dia: number) {
    if (!cardapioAtual) return;
    const res = await fetch(
      `/api/cardapios/${cardapioAtual.id}/refeicao?dia=${dia}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Erro");
      return;
    }
    toast.success("Desmarcado");
    router.refresh();
  }

  async function handleChangeStatus(novoStatus: "publicado" | "draft" | "arquivado") {
    if (!cardapioAtual) return;
    setPublishing(true);
    try {
      const res = await fetch(
        `/api/cardapios/${cardapioAtual.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: novoStatus }),
        }
      );
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Erro");
      }
      toast.success(
        novoStatus === "publicado"
          ? "Publicado! Unidades já podem ver 🎉"
          : novoStatus === "arquivado"
            ? "Arquivado"
            : "Voltou para rascunho"
      );
      setLocalData((prev) =>
        prev.map((c) =>
          c.id === cardapioAtual.id ? { ...c, status: novoStatus } : c
        )
      );
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  }

  const grid = cardapioAtual ? buildGrid(cardapioAtual.cardapio_refeicoes) : {};

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          href="/admin/semanas"
          className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 hover:text-brand-primary transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-dark">
              Semana de{" "}
              {formatWeekRange(semana, cardapioAtual?.semana_fim ?? semana)}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm">
              {cardapioAtual?.gerado_por === "ia" && (
                <span className="inline-flex items-center gap-1 text-brand-dark/60">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerado com IA
                </span>
              )}
              {cardapioAtual && <StatusBadge status={cardapioAtual.status} />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cardapioAtual?.status !== "publicado" ? (
              <Button
                onClick={() => handleChangeStatus("publicado")}
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Publicar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleChangeStatus("draft")}
                  disabled={publishing}
                >
                  <XCircle className="w-4 h-4" />
                  Despublicar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleChangeStatus("arquivado")}
                  disabled={publishing}
                >
                  <Archive className="w-4 h-4" />
                  Arquivar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {FAIXAS_ETARIAS.map((faixa) => {
          const c = localData.find((x) => x.faixa_etaria === faixa.id);
          const active = faixa.id === faixaAtual;
          return (
            <button
              key={faixa.id}
              onClick={() => setFaixaAtual(faixa.id as FaixaEtariaId)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                active
                  ? "bg-brand-primary text-white shadow-md"
                  : c
                    ? "bg-white text-brand-dark hover:bg-brand-light border border-brand-dark/10"
                    : "bg-zinc-50 text-brand-dark/40 border border-brand-dark/5"
              }`}
            >
              {faixa.nome} · {faixa.idade}
            </button>
          );
        })}
      </div>

      {cardapioAtual ? (
        <CardapioGrid
          grid={grid}
          editable
          onSave={handleSaveRefeicao}
          onMarkSpecial={handleMarkSpecial}
          onClearSpecial={handleClearSpecial}
        />
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-brand-dark/60 mb-4">
              Cardápio para{" "}
              <strong>
                {faixaInfo?.nome} {faixaInfo?.idade}
              </strong>{" "}
              ainda não foi gerado.
            </p>
            <Button asChild>
              <Link href={`/admin/semanas/nova?semana=${semana}`}>
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-pastel-mint/40 rounded-2xl p-4 text-sm text-brand-dark/70"
      >
        💡 <strong>Dica:</strong> clique em qualquer célula para editar. Passe o
        mouse no cabeçalho do dia para marcar feriado/suspensa.
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Rascunho", className: "bg-zinc-100 text-zinc-700" },
    em_revisao: {
      label: "Em revisão",
      className: "bg-amber-100 text-amber-700",
    },
    aprovado: { label: "Aprovado", className: "bg-sky-100 text-sky-700" },
    publicado: {
      label: "Publicado",
      className: "bg-emerald-100 text-emerald-700",
    },
    arquivado: {
      label: "Arquivado",
      className: "bg-zinc-100 text-zinc-500",
    },
  };
  const m = map[status] ?? map.draft;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${m.className}`}
    >
      {m.label}
    </span>
  );
}
