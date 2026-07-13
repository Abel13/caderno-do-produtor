import Link from "next/link";

import { Calendar } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { canManageAccount, chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { ClimateWaterRepository } from "@/modules/climate-water/infrastructure/supabase/climate-water-repository";
import { ClimateOverview } from "./components/climate-page-client";

export default async function ClimatePage() {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;

  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new ClimateWaterRepository(await createClient());
  const formContext = await repository.getFormContext(property.id);
  const activeSeason = formContext.seasons.find((season) => season.id === context.profile.last_season_id) ?? formContext.seasons.find((season) => season.status === "open") ?? null;
  const summary = await repository.getSummary(property.id, activeSeason?.id ?? null);

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <Calendar className="size-4 rotate-180" aria-hidden="true" />
          Voltar para dashboard
        </Link>
        <ClimateOverview
          canManage={canManageAccount(membership?.role ?? "viewer")}
          propertyName={property.name}
          activeSeasonName={activeSeason?.name ?? null}
          summary={summary}
        />
      </div>
    </main>
  );
}
