import type React from "react";

import { FileText } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { canManageAccount, chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { soilCorrectionFilterSchema } from "@/modules/soil-nutrition/domain/schemas";
import { SoilNutritionRepository } from "@/modules/soil-nutrition/infrastructure/supabase/soil-nutrition-repository";
import { SoilCorrectionsPageClient } from "./soil-corrections-page-client";

export default async function SoilCorrectionsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;
  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new SoilNutritionRepository(await createClient());
  const parsed = soilCorrectionFilterSchema.parse({
    propertyId: property.id,
    plotId: toStringValue(searchParams?.plotId),
    plantingId: toStringValue(searchParams?.plantingId),
    seasonId: toStringValue(searchParams?.seasonId, context.profile.last_season_id ?? ""),
    soilAnalysisId: toStringValue(searchParams?.soilAnalysisId),
    from: toStringValue(searchParams?.from),
    to: toStringValue(searchParams?.to),
    showDeleted: toStringValue(searchParams?.showDeleted),
  });
  const [formContext, corrections] = await Promise.all([repository.getFormContext(property.id), repository.listCorrections(parsed)]);
  return (
    <SoilRouteShell>
      <SoilCorrectionsPageClient
        canManage={canManageAccount(membership?.role ?? "viewer")}
        propertyId={property.id}
        propertyName={property.name}
        context={formContext}
        corrections={corrections}
        searchParams={{
          plotId: toStringValue(searchParams?.plotId),
          plantingId: toStringValue(searchParams?.plantingId),
          seasonId: toStringValue(searchParams?.seasonId, context.profile.last_season_id ?? ""),
          soilAnalysisId: toStringValue(searchParams?.soilAnalysisId),
          from: toStringValue(searchParams?.from),
          to: toStringValue(searchParams?.to),
          showDeleted: toStringValue(searchParams?.showDeleted) === "1",
        }}
      />
    </SoilRouteShell>
  );
}

function toStringValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) return value[0] ?? fallback;
  if (value === undefined) return fallback;
  return String(value);
}

function SoilRouteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <a href="/soil" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <FileText className="size-4" aria-hidden="true" />
          Voltar para solo e nutrição
        </a>
        {children}
      </div>
    </main>
  );
}
