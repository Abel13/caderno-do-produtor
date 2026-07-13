import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardViewModel } from "@/modules/dashboard/domain/rules";
import { DashboardRepository } from "@/modules/dashboard/infrastructure/supabase/dashboard-repository";
import { chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";

export default async function DashboardPage() {
  const { context } = await requireIdentityContext();
  const activeProperty = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!activeProperty) return <main className="p-8"><h1 className="text-2xl font-bold">Nenhuma propriedade disponível</h1><p className="mt-2 text-stone-600">Seu acesso pode ter sido revogado. Solicite ao administrador da conta.</p></main>;
  const membership = context.memberships.find((item) => item.account_id === activeProperty.account_id);
  const repository = new DashboardRepository(await createClient());
  const summary = await repository.getSummary(activeProperty.id);
  const dashboard = buildDashboardViewModel({
    activeProperty,
    preferredSeasonId: context.profile.last_season_id,
    role: membership?.role ?? "viewer",
    ...summary,
  });

  return <DashboardShell context={context} dashboard={dashboard}/>;
}
