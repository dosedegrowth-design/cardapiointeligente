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
  if (usuario.role === "super_admin") redirect("/admin");

  const unidadeName = (usuario.unidades as any)?.nome ?? null;

  return (
    <div className="min-h-screen bg-brand-light">
      <AppHeader role="unidade" userName={usuario.nome} unidadeName={unidadeName} />
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
