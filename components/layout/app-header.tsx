"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChefHat, LogOut, Home, Calendar, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  role: "super_admin" | "unidade";
  userName?: string | null;
  unidadeName?: string | null;
}

export function AppHeader({ role, userName, unidadeName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    role === "super_admin"
      ? [
          { href: "/admin", label: "Início", icon: Home },
          { href: "/admin/semanas", label: "Cardápios", icon: Calendar },
        ]
      : [
          { href: "/app", label: "Início", icon: Home },
          { href: "/app/lista-compras", label: "Compras", icon: ShoppingCart },
        ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-brand-dark/5">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href={role === "super_admin" ? "/admin" : "/app"} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center shadow">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-serif font-bold text-brand-dark">Cardápio</div>
              <div className="text-[10px] uppercase tracking-wider text-brand-dark/50">
                Inteligente
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition",
                    active
                      ? "bg-brand-primary/10 text-brand-primary font-medium"
                      : "text-brand-dark/60 hover:text-brand-dark hover:bg-brand-dark/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-sm font-medium text-brand-dark">
              {userName || "Usuário"}
            </div>
            <div className="text-[11px] text-brand-dark/50">
              {role === "super_admin" ? "Super Admin" : unidadeName || "Unidade"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-brand-dark/60 hover:bg-red-50 hover:text-red-600 transition"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
