"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChefHat, Loader2, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setSent(true);
      toast.success("Link mágico enviado!", {
        description: "Confira seu email para entrar.",
      });
    } catch (err: any) {
      toast.error("Erro ao enviar link", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-light via-pastel-mint/40 to-pastel-sky/30 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary shadow-lg shadow-brand-primary/30 mb-4"
          >
            <ChefHat className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="font-serif text-3xl font-bold text-brand-dark mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-brand-dark/60 text-sm">
            Acesse o Cardápio Inteligente
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-brand-dark/5 p-8 border border-brand-dark/5">
          {!sent ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-brand-dark mb-2"
                >
                  Seu email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@creche.com.br"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-brand-dark/15 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary text-white font-medium shadow-lg shadow-brand-primary/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enviar link mágico
                  </>
                )}
              </button>

              <p className="text-xs text-brand-dark/50 text-center leading-relaxed">
                Você receberá um email com link de acesso.
                <br />
                Sem senha, sem complicação.
              </p>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-pastel-mint flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-brand-secondary" />
              </div>
              <h2 className="font-serif text-xl font-bold text-brand-dark mb-2">
                Confira seu email
              </h2>
              <p className="text-sm text-brand-dark/60 mb-6">
                Enviamos um link mágico para{" "}
                <span className="font-medium text-brand-dark">{email}</span>
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="text-sm text-brand-primary hover:underline"
              >
                Usar outro email
              </button>
            </motion.div>
          )}
        </div>

        <p className="text-center text-xs text-brand-dark/40 mt-6">
          Cardápio Inteligente · Dose de Growth
        </p>
      </motion.div>
    </main>
  );
}
