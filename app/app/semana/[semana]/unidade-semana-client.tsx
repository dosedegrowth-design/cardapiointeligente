"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardapioGrid,
  type CardapioCell,
} from "@/components/cardapio/cardapio-grid";
import {
  FAIXAS_ETARIAS,
  type FaixaEtariaId,
  type RefeicaoId,
} from "@/lib/constants";
import { formatWeekRange } from "@/lib/utils";
import { toast } from "sonner";

interface RefeicaoRow {
  id?: string;
  dia: number;
  refeicao: RefeicaoId;
  descricao: string | null;
  especial?: "atividade_suspensa" | "feriado" | null;
  feriado_nome?: string | null;
}

interface CardapioData {
  id: string;
  semana_inicio: string;
  semana_fim: string;
  faixa_etaria: FaixaEtariaId;
  cardapio_refeicoes: RefeicaoRow[];
}

interface Props {
  semana: string;
  faixaInicial: FaixaEtariaId;
  cardapios: CardapioData[];
  overrides: Record<string, RefeicaoRow[]>; // cardapio_padrao_id → overrides
  horarios?: Record<string, string> | null;
  editable: boolean;
}

function buildGrid(
  refeicoes: RefeicaoRow[],
  overrides: RefeicaoRow[]
): Record<number, Partial<Record<RefeicaoId, CardapioCell>>> {
  const grid: Record<number, Partial<Record<RefeicaoId, CardapioCell>>> = {};
  // padrão
  for (const r of refeicoes) {
    if (!grid[r.dia]) grid[r.dia] = {};
    grid[r.dia][r.refeicao] = {
      descricao: r.descricao,
      especial: r.especial,
      feriado_nome: r.feriado_nome,
    };
  }
  // overrides por cima
  for (const o of overrides) {
    if (!grid[o.dia]) grid[o.dia] = {};
    grid[o.dia][o.refeicao] = {
      ...(grid[o.dia][o.refeicao] ?? {}),
      descricao: o.descricao,
      override: true,
    };
  }
  return grid;
}

export function UnidadeSemanaClient({
  semana,
  faixaInicial,
  cardapios,
  overrides,
  horarios,
  editable,
}: Props) {
  const [faixa, setFaixa] = useState<FaixaEtariaId>(faixaInicial);
  const [localOverrides, setLocalOverrides] = useState(overrides);

  const cardapio = cardapios.find((c) => c.faixa_etaria === faixa);
  const faixaInfo = FAIXAS_ETARIAS.find((f) => f.id === faixa);

  const grid = cardapio
    ? buildGrid(
        cardapio.cardapio_refeicoes,
        localOverrides[cardapio.id] ?? []
      )
    : {};

  async function handleSave(
    dia: number,
    refeicao: RefeicaoId,
    descricao: string
  ) {
    if (!cardapio) return;
    const res = await fetch("/api/cardapios-unidade/refeicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardapio_padrao_id: cardapio.id,
        dia,
        refeicao,
        descricao,
      }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Erro");
    }
    // Atualiza estado local
    setLocalOverrides((prev) => {
      const prevList = prev[cardapio.id] ?? [];
      const semEssa = prevList.filter(
        (o) => !(o.dia === dia && o.refeicao === refeicao)
      );
      return {
        ...prev,
        [cardapio.id]: [
          ...semEssa,
          { dia, refeicao, descricao },
        ],
      };
    });
  }

  async function handleRemoveOverride(dia: number, refeicao: RefeicaoId) {
    if (!cardapio) return;
    const res = await fetch(
      `/api/cardapios-unidade/refeicao?cardapio_padrao_id=${cardapio.id}&dia=${dia}&refeicao=${refeicao}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const { error } = await res.json();
      toast.error(error ?? "Erro");
      return;
    }
    setLocalOverrides((prev) => ({
      ...prev,
      [cardapio.id]: (prev[cardapio.id] ?? []).filter(
        (o) => !(o.dia === dia && o.refeicao === refeicao)
      ),
    }));
    toast.success("Voltou ao padrão");
  }

  const countOverrides = cardapio ? (localOverrides[cardapio.id] ?? []).length : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-brand-dark/60 hover:text-brand-primary transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-dark">
              {formatWeekRange(semana, cardapio?.semana_fim ?? semana)}
            </h1>
            <p className="text-brand-dark/60 mt-1">
              {faixaInfo?.nome} · {faixaInfo?.idade}
              {countOverrides > 0 && (
                <span className="ml-2 text-xs bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full font-medium">
                  {countOverrides} ajuste{countOverrides > 1 ? "s" : ""} seu{countOverrides > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          {cardapio && (
            <Button asChild>
              <Link
                href={`/api/pdf?semana=${semana}&faixa=${faixa}`}
                target="_blank"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Link>
            </Button>
          )}
        </div>
      </div>

      {editable && (
        <div className="bg-pastel-mint/40 rounded-2xl p-4 text-sm text-brand-dark/70">
          💡 <strong>Dica:</strong> clique em qualquer célula para ajustar só pra
          SUA unidade. Suas mudanças não afetam as outras unidades. Para voltar ao padrão, use o botão abaixo.
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {FAIXAS_ETARIAS.map((f) => {
          const c = cardapios.find((x) => x.faixa_etaria === f.id);
          const active = f.id === faixa;
          return (
            <button
              key={f.id}
              onClick={() => setFaixa(f.id as FaixaEtariaId)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                active
                  ? "bg-brand-primary text-white shadow-md"
                  : c
                    ? "bg-white text-brand-dark hover:bg-brand-light border border-brand-dark/10"
                    : "bg-zinc-50 text-brand-dark/40 border border-brand-dark/5"
              }`}
            >
              {f.nome} · {f.idade}
            </button>
          );
        })}
      </div>

      {cardapio ? (
        <>
          <CardapioGrid
            grid={grid}
            editable={editable}
            horarios={horarios as any}
            onSave={handleSave}
          />
          {countOverrides > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Remover todos os seus ajustes e voltar ao padrão?"))
                    (localOverrides[cardapio.id] ?? []).forEach((o) =>
                      handleRemoveOverride(o.dia, o.refeicao)
                    );
                }}
              >
                <Undo2 className="w-4 h-4" />
                Remover meus ajustes
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-brand-dark/60">
          Cardápio não publicado para esta faixa etária.
        </div>
      )}
    </div>
  );
}
