"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChefHat, Sparkles, Apple, Utensils, Baby, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-light via-pastel-butter/30 to-pastel-peach/40 overflow-hidden">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <span className="font-serif text-xl font-bold text-brand-dark">
            Cardápio Inteligente
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-full bg-brand-dark text-white text-sm font-medium hover:bg-brand-dark/90 transition-colors"
          >
            Entrar
          </Link>
        </motion.div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-12 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-brand-primary/20 text-sm text-brand-dark mb-6"
          >
            <Sparkles className="w-4 h-4 text-brand-primary" />
            Powered by IA — Gera, substitui e valida
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-serif text-5xl md:text-7xl font-bold text-brand-dark leading-tight mb-6"
          >
            Cardápios semanais
            <br />
            <span className="italic text-brand-primary">sem dor de cabeça.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-brand-dark/70 max-w-2xl mx-auto mb-10"
          >
            A IA gera o cardápio da semana baseado na referência da prefeitura,
            cruza com a lista de compras da sua unidade e entrega pronto pra
            publicar. Você só revisa.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-medium shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/40 transition-all hover:-translate-y-0.5"
            >
              Acessar o sistema
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#como-funciona"
              className="px-6 py-3 rounded-full border border-brand-dark/20 text-brand-dark font-medium hover:bg-white/60 transition-colors"
            >
              Como funciona
            </Link>
          </motion.div>
        </div>

        {/* Cards flutuantes */}
        <div className="mt-24 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Sparkles,
              title: "IA gera sozinha",
              desc: "Toda semana, o sistema busca a referência da prefeitura e monta 3 cardápios (berçário I 0-5m, 6-11m e berçário II).",
              color: "bg-pastel-rose",
              iconColor: "text-brand-primary",
              delay: 0.5,
            },
            {
              icon: Apple,
              title: "Substitui automático",
              desc: "Não comprou maçã? A IA troca por pera, banana ou mamão — mantendo o valor nutricional.",
              color: "bg-pastel-mint",
              iconColor: "text-brand-secondary",
              delay: 0.6,
            },
            {
              icon: Utensils,
              title: "PDF pronto pra imprimir",
              desc: "Cada unidade baixa seu PDF com identidade visual própria, logo e cores personalizadas.",
              color: "bg-pastel-butter",
              iconColor: "text-amber-600",
              delay: 0.7,
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`${card.color} rounded-3xl p-8 shadow-sm`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center mb-4">
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <h3 className="font-serif text-xl font-bold text-brand-dark mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-brand-dark/70 leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark text-center mb-4">
            Três faixas, um fluxo.
          </h2>
          <p className="text-center text-brand-dark/70 mb-12 max-w-2xl mx-auto">
            Cada creche atende crianças de diferentes idades. O sistema já gera
            os três cardápios automaticamente.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                faixa: "Berçário I",
                idade: "0 a 5 meses",
                desc: "Leite materno ou fórmula infantil 1.",
                color: "from-pastel-sky to-pastel-lavender",
              },
              {
                faixa: "Berçário I",
                idade: "6 a 11 meses",
                desc: "Fórmula 2 + introdução alimentar com frutas e papinhas.",
                color: "from-pastel-mint to-pastel-butter",
              },
              {
                faixa: "Berçário II",
                idade: "1 a 4 anos",
                desc: "Alimentação completa — desjejum, colação, almoço, lanche e tarde.",
                color: "from-pastel-peach to-pastel-rose",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${item.color} rounded-3xl p-6 relative overflow-hidden`}
              >
                <Baby className="w-8 h-8 text-brand-dark mb-4" />
                <h3 className="font-serif text-2xl font-bold text-brand-dark">
                  {item.faixa}
                </h3>
                <p className="text-sm text-brand-dark/70 font-medium mb-2">
                  {item.idade}
                </p>
                <p className="text-sm text-brand-dark/80">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-brand-dark/10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-brand-dark/60">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Cardápio Inteligente v0.1
          </div>
          <div>
            feito com carinho pela{" "}
            <span className="font-medium text-brand-dark">Dose de Growth</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
