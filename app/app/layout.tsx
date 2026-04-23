import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UnidadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, role, unidade_id, unidades(nome)")
    .eq("id", user.id)
    .single();

  if (!usuario) redirect("/login");

  const unidadeName = (usuario.unidades as any)?.nome ?? null;
  const isSuperAdmin = usuario.role === "super_admin";

  return (
    <div className="min-h-screen bg-brand-light">
      <AppHeader
        role={isSuperAdmin ? "super_admin" : "unidade"}
        userName={usuario.nome}
        unidadeName={isSuperAdmin ? "Modo visualização" : unidadeName}
      />
      {isSuperAdmin && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-6 py-2 text-xs text-amber-800 flex items-center justify-between">
            <span>
              ⓘ Você está vendo o sistema como uma unidade veria. Escolha uma unidade no dashboard pra simular.
            </span>
            <a
              href="/admin"
              className="underline hover:no-underline"
            >
              Voltar ao admin
            </a>
          </div>
        </div>
      )}
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
