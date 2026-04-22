import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Busca o usuário na tabela customizada pra saber role
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, role, unidade_id")
    .eq("id", user.id)
    .single();

  // Se não for super admin, redireciona pra /app (área da unidade)
  if (!usuario || usuario.role !== "super_admin") {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-brand-light">
      <AppHeader role="super_admin" userName={usuario.nome} />
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
