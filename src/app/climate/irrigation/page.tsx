import type React from "react";

import { Calendar } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { irrigationFilterSchema } from "@/modules/climate-water/domain/schemas";
import { ClimateWaterRepository } from "@/modules/climate-water/infrastructure/supabase/climate-water-repository";
import { canManageAccount, chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { IrrigationPageClient } from "../components/climate-page-client";

export default async function IrrigationPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;
  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new ClimateWaterRepository(await createClient());
  const parsed = irrigationFilterSchema.parse({
    propertyId: property.id,
    irrigationSystemId: toStringValue(searchParams?.irrigationSystemId),
    seasonId: toStringValue(searchParams?.seasonId),
    plotId: toStringValue(searchParams?.plotId),
    from: toStringValue(searchParams?.from),
    to: toStringValue(searchParams?.to),
    showDeleted: toStringValue(searchParams?.showDeleted),
  });
  const [contextData, events] = await Promise.all([repository.getFormContext(property.id), repository.listIrrigationEvents(parsed)]);

  return (
    <ClimateRouteShell backHref="/climate">
      <IrrigationPageClient
        canManage={canManageAccount(membership?.role ?? "viewer")}
        propertyId={property.id}
        propertyName={property.name}
        context={contextData}
        events={events}
        searchParams={{
          irrigationSystemId: toStringValue(searchParams?.irrigationSystemId),
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
