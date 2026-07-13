import type React from "react";

import { Calendar } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { canManageAccount, chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { climateFilterSchema } from "@/modules/climate-water/domain/schemas";
import { ClimateWaterRepository } from "@/modules/climate-water/infrastructure/supabase/climate-water-repository";
import { ClimateListPage } from "../components/climate-page-client";

export default async function RainfallPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;
  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new ClimateWaterRepository(await createClient());
  const parsed = climateFilterSchema.parse({
    propertyId: property.id,
    controlType: "rainfall",
    measurementPointId: toStringValue(searchParams?.measurementPointId),
    seasonId: toStringValue(searchParams?.seasonId),
    plotId: toStringValue(searchParams?.plotId),
    from: toStringValue(searchParams?.from),
    to: toStringValue(searchParams?.to),
    showDeleted: toStringValue(searchParams?.showDeleted),
  });
  const [contextData, readings] = await Promise.all([repository.getFormContext(property.id), repository.listReadings(parsed)]);

  return (
    <ClimateRouteShell backHref="/climate">
      <ClimateListPage
        canManage={canManageAccount(membership?.role ?? "viewer")}
        propertyId={property.id}
        propertyName={property.name}
        controlType="rainfall"
        context={contextData}
        readings={readings}
        searchParams={{
          measurementPointId: toStringValue(searchParams?.measurementPointId),
          seasonId: toStringValue(searchParams?.seasonId),
          plotId: toStringValue(searchParams?.plotId),
          from: toStringValue(searchParams?.from),
          to: toStringValue(searchParams?.to),
          showDeleted: toStringValue(searchParams?.showDeleted) === "1",
        }}
      />
    </ClimateRouteShell>
  );
}

function toStringValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) return value[0] ?? fallback;
  if (value === undefined) return fallback;
  return String(value);
}

function ClimateRouteShell({ backHref, children }: { backHref: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <a href={backHref} className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <Calendar className="size-4 rotate-180" aria-hidden="true" />
          Voltar para clima e água
        </a>
        {children}
      </div>
    </main>
  );
}
