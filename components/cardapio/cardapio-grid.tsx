"use client";

import { motion } from "framer-motion";
import { Ban, CalendarOff, Edit3 } from "lucide-react";
import { DIAS_SEMANA, REFEICOES, type RefeicaoId } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CardapioCell {
  descricao: string | null;
  especial?: "atividade_suspensa" | "feriado" | null;
  feriado_nome?: string | null;
  override?: boolean;
}

interface Props {
  grid: Record<number, Partial<Record<RefeicaoId, CardapioCell>>>;
  editable?: boolean;
  onCellClick?: (dia: number, refeicao: RefeicaoId) => void;
}

export function CardapioGrid({ grid, editable = false, onCellClick }: Props) {
  // Se algum dia tem especial em qualquer refeição, consideramos o dia inteiro "especial"
  const diasEspeciais: Record<number, CardapioCell | null> = {};
  for (const dia of DIAS_SEMANA) {
    const cells = grid[dia.id] ?? {};
    const especial = Object.values(cells).find((c) => c?.especial);
    diasEspeciais[dia.id] = especial ?? null;
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-brand-dark/5 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header: dias da semana */}
          <div className="grid grid-cols-[140px_repeat(5,1fr)] border-b border-brand-dark/5">
            <div className="p-4 bg-brand-light/50" />
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia.id}
                className="p-4 text-center bg-brand-light/50"
              >
                <div className="font-serif text-base font-semibold text-brand-dark">
                  {dia.nome}
                </div>
              </div>
            ))}
          </div>

          {/* Linhas: uma por refeição */}
          {REFEICOES.map((refeicao) => (
            <div
              key={refeicao.id}
              className="grid grid-cols-[140px_repeat(5,1fr)] border-b border-brand-dark/5 last:border-b-0"
            >
              <div
                className={`p-4 flex flex-col justify-center bg-${refeicao.cor}/30`}
              >
                <div className="font-medium text-brand-dark text-sm">
                  {refeicao.nome}
                </div>
                <div className="text-[11px] text-brand-dark/50">
                  {refeicao.horario}
                </div>
              </div>

              {DIAS_SEMANA.map((dia) => {
                const especial = diasEspeciais[dia.id];
                const cell = grid[dia.id]?.[refeicao.id];

                // Se dia inteiro é especial, só mostra na linha do almoço (célula mescla-like)
                if (especial && refeicao.id !== "almoco") {
                  return (
                    <div
                      key={dia.id}
                      className="p-3 border-l border-brand-dark/5 bg-zinc-50/50"
                    />
                  );
                }

                if (especial && refeicao.id === "almoco") {
                  return (
                    <EspecialCell
                      key={dia.id}
                      tipo={especial.especial!}
                      nome={especial.feriado_nome}
                    />
                  );
                }

                return (
                  <Cell
                    key={dia.id}
                    descricao={cell?.descricao ?? null}
                    override={cell?.override}
                    editable={editable}
                    onClick={() => onCellClick?.(dia.id, refeicao.id)}
                    color={refeicao.cor}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cell({
  descricao,
  override,
  editable,
  onClick,
  color,
}: {
  descricao: string | null;
  override?: boolean;
  editable?: boolean;
  onClick?: () => void;
  color: string;
}) {
  return (
    <motion.button
      whileHover={editable ? { scale: 1.02 } : {}}
      whileTap={editable ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={!editable}
      className={cn(
        "p-3 border-l border-brand-dark/5 text-left text-xs text-brand-dark/80 leading-relaxed min-h-[90px] relative group",
        editable && "cursor-pointer hover:bg-brand-light/50 transition",
        override && `bg-${color}/20`
      )}
    >
      {descricao ? (
        <>
          {override && (
            <div className="absolute top-1.5 right-1.5 text-[9px] uppercase tracking-wider bg-brand-primary text-white px-1.5 py-0.5 rounded-full font-medium">
              Editado
            </div>
          )}
          <div className="line-clamp-4">{descricao}</div>
        </>
      ) : (
        <div className="text-brand-dark/30 italic">—</div>
      )}
      {editable && (
        <Edit3 className="absolute bottom-2 right-2 w-3.5 h-3.5 text-brand-primary/0 group-hover:text-brand-primary/70 transition" />
      )}
    </motion.button>
  );
}

function EspecialCell({
  tipo,
  nome,
}: {
  tipo: "atividade_suspensa" | "feriado";
  nome?: string | null;
}) {
  const Icon = tipo === "feriado" ? CalendarOff : Ban;
  const label = tipo === "feriado" ? nome ?? "Feriado" : "Atividade suspensa";

  return (
    <div
      className="border-l border-brand-dark/5 bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-3 min-h-[90px]"
      style={{ gridRow: "span 5" }}
    >
      <div className="text-center">
        <Icon className="w-5 h-5 mx-auto text-brand-dark/40 mb-1" />
        <div className="text-[11px] font-medium uppercase tracking-wider text-brand-dark/60">
          {label}
        </div>
      </div>
    </div>
  );
}
