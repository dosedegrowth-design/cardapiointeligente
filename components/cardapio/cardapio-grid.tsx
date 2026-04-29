"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ban,
  CalendarOff,
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Soup,
  Pencil,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { DIAS_SEMANA, REFEICOES, type RefeicaoId } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CardapioCell {
  descricao: string | null;
  especial?: "atividade_suspensa" | "feriado" | null;
  feriado_nome?: string | null;
  override?: boolean;
}

interface Props {
  grid: Record<number, Partial<Record<RefeicaoId, CardapioCell>>>;
  editable?: boolean;
  horarios?: Partial<Record<RefeicaoId, string>> | null;
  onSave?: (
    dia: number,
    refeicao: RefeicaoId,
    descricao: string
  ) => Promise<void>;
  onMarkSpecial?: (
    dia: number,
    tipo: "atividade_suspensa" | "feriado",
    nome?: string
  ) => Promise<void>;
  onClearSpecial?: (dia: number) => Promise<void>;
}

const ICONS_REFEICAO: Record<RefeicaoId, React.ElementType> = {
  desjejum: Coffee,
  colacao: Apple,
  almoco: UtensilsCrossed,
  lanche: Cookie,
  tarde: Soup,
};

const BG_REFEICAO: Record<RefeicaoId, string> = {
  desjejum: "bg-rose-50",
  colacao: "bg-amber-50",
  almoco: "bg-emerald-50",
  lanche: "bg-orange-50",
  tarde: "bg-violet-50",
};

const ACCENT_REFEICAO: Record<RefeicaoId, string> = {
  desjejum: "text-rose-600 bg-rose-100",
  colacao: "text-amber-700 bg-amber-100",
  almoco: "text-emerald-700 bg-emerald-100",
  lanche: "text-orange-700 bg-orange-100",
  tarde: "text-violet-700 bg-violet-100",
};

export function CardapioGrid({
  grid,
  editable = false,
  horarios,
  onSave,
  onMarkSpecial,
  onClearSpecial,
}: Props) {
  const [editing, setEditing] = useState<{
    dia: number;
    refeicao: RefeicaoId;
  } | null>(null);

  const diasEspeciais: Record<number, CardapioCell | null> = {};
  for (const dia of DIAS_SEMANA) {
    const cells = grid[dia.id] ?? {};
    const esp = Object.values(cells).find((c) => c?.especial);
    diasEspeciais[dia.id] = esp ?? null;
  }

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-brand-dark/5 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-[160px_repeat(5,1fr)] bg-gradient-to-r from-brand-primary to-pastel-coral text-white">
              <div className="p-4 font-serif font-bold">Refeições</div>
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia.id}
                  className="p-4 text-center relative group"
                >
                  <div className="font-serif text-lg font-bold">
                    {dia.nome}
                  </div>
                  {editable && diasEspeciais[dia.id] === null && (
                    <button
                      onClick={async () => {
                        const nome = prompt(
                          "Nome do feriado (ou deixe vazio para 'Atividade suspensa'):"
                        );
                        if (nome === null) return;
                        const tipo = nome.trim()
                          ? "feriado"
                          : "atividade_suspensa";
                        await onMarkSpecial?.(
                          dia.id,
                          tipo,
                          nome.trim() || undefined
                        );
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full"
                      title="Marcar como feriado"
                    >
                      +
                    </button>
                  )}
                  {editable && diasEspeciais[dia.id] !== null && (
                    <button
                      onClick={() => onClearSpecial?.(dia.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-xs bg-white/20 hover:bg-white/30 px-1 rounded-full"
                      title="Desmarcar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {REFEICOES.map((refeicao) => {
              const Icon = ICONS_REFEICAO[refeicao.id];
              return (
                <div
                  key={refeicao.id}
                  className="grid grid-cols-[160px_repeat(5,1fr)] border-b border-brand-dark/5 last:border-b-0"
                >
                  <div
                    className={cn(
                      "p-4 flex items-center gap-3 border-r border-brand-dark/5",
                      BG_REFEICAO[refeicao.id]
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        ACCENT_REFEICAO[refeicao.id]
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-brand-dark">
                        {refeicao.nome}
                      </div>
                      <div className="text-[10px] text-brand-dark/50">
                        {horarios?.[refeicao.id] ?? refeicao.horario}
                      </div>
                    </div>
                  </div>

                  {DIAS_SEMANA.map((dia) => {
                    const especial = diasEspeciais[dia.id];
                    const cell = grid[dia.id]?.[refeicao.id];

                    if (especial && refeicao.id !== "almoco") {
                      return (
                        <div
                          key={dia.id}
                          className="border-l border-brand-dark/5 bg-zinc-50/50"
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
                        onClick={() =>
                          editable &&
                          setEditing({ dia: dia.id, refeicao: refeicao.id })
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <EditModal
            dia={editing.dia}
            refeicao={editing.refeicao}
            initial={
              grid[editing.dia]?.[editing.refeicao]?.descricao ?? ""
            }
            onClose={() => setEditing(null)}
            onSave={async (descricao) => {
              if (!onSave) return;
              await onSave(editing.dia, editing.refeicao, descricao);
              setEditing(null);
              toast.success("Salvo!");
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Cell({
  descricao,
  override,
  editable,
  onClick,
}: {
  descricao: string | null;
  override?: boolean;
  editable?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!editable}
      className={cn(
        "p-3 border-l border-brand-dark/5 text-left text-xs text-brand-dark/90 leading-relaxed min-h-[95px] relative group transition w-full",
        editable && "cursor-pointer hover:bg-brand-primary/5",
        override && "bg-brand-primary/5",
        !editable && "cursor-default"
      )}
    >
      {descricao ? (
        <>
          {override && (
            <div className="absolute top-1.5 right-1.5 text-[8px] uppercase tracking-wider bg-brand-primary text-white px-1.5 py-0.5 rounded-full font-bold">
              editado
            </div>
          )}
          <div className="whitespace-pre-wrap">{descricao}</div>
        </>
      ) : (
        <div className="text-brand-dark/30 italic flex items-center justify-center h-full">
          {editable ? "+ adicionar" : "—"}
        </div>
      )}
      {editable && descricao && (
        <Pencil className="absolute bottom-2 right-2 w-3 h-3 text-brand-primary/0 group-hover:text-brand-primary/60 transition" />
      )}
    </button>
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
  const label =
    tipo === "feriado" ? nome ?? "Feriado" : "Atividade suspensa";

  return (
    <div
      className="border-l border-brand-dark/5 bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-3 min-h-[95px]"
      style={{ gridRow: "span 5" }}
    >
      <div className="text-center">
        <Icon className="w-6 h-6 mx-auto text-brand-dark/40 mb-2" />
        <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-dark/60 max-w-[100px] mx-auto leading-tight">
          {label}
        </div>
      </div>
    </div>
  );
}

function EditModal({
  dia,
  refeicao,
  initial,
  onClose,
  onSave,
}: {
  dia: number;
  refeicao: RefeicaoId;
  initial: string;
  onClose: () => void;
  onSave: (descricao: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  const diaInfo = DIAS_SEMANA.find((d) => d.id === dia)!;
  const refeicaoInfo = REFEICOES.find((r) => r.id === refeicao)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-6 border-b border-brand-dark/5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand-dark/50 mb-1">
              {diaInfo.nome} · {refeicaoInfo.horario}
            </div>
            <h3 className="font-serif text-xl font-bold text-brand-dark">
              {refeicaoInfo.nome}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-brand-dark/5 transition"
          >
            <X className="w-4 h-4 text-brand-dark/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="block text-sm font-medium text-brand-dark mb-2">
              Descrição da refeição
            </label>
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                refeicao === "desjejum"
                  ? "Ex: Leite integral + pão caseiro + mamão"
                  : refeicao === "almoco"
                    ? "Ex: Arroz, feijão carioca, frango grelhado, salada + maçã"
                    : "Descrição do que será servido"
              }
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-brand-dark/50 mt-2">
              Dica: separe os itens por vírgula ou &quot;+&quot;
            </p>
          </div>

          <div className="p-6 pt-0 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-brand-dark/70 hover:bg-brand-dark/5 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm bg-brand-primary text-white font-medium hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
