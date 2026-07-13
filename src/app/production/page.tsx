import type React from "react";

import { Clipboard } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { chooseActiveProperty, canManageAccount } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { productionFilterSchema } from "@/modules/production/domain/schemas";
import { ProductionRepository } from "@/modules/production/infrastructure/supabase/production-repository";
import { ProductionPageClient } from "./production-page-client";

export default async function ProductionPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;

  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new ProductionRepository(await createClient());
  const parsed = productionFilterSchema.parse({
    propertyId: property.id,
    plotId: toStringValue(searchParams?.plotId),
    plantingId: toStringValue(searchParams?.plantingId),
    seasonId: toStringValue(searchParams?.seasonId, context.profile.last_season_id ?? ""),
    from: toStringValue(searchParams?.from),
    to: toStringValue(searchParams?.to),
    showDeleted: toStringValue(searchParams?.showDeleted),
  });
  const [formContext, records] = await Promise.all([repository.getFormContext(property.id), repository.listRecords(parsed)]);

  return (
    <ProductionRouteShell>
      <ProductionPageClient
        canManage={canManageAccount(membership?.role ?? "viewer")}
        propertyId={property.id}
        propertyName={property.name}
        context={formContext}
        records={records}
        searchParams={{
          plotId: toStringValue(searchParams?.plotId),
          plantingId: toStringValue(searchParams?.plantingId),
          seasonId: toStringValue(searchParams?.seasonId, context.profile.last_season_id ?? ""),
          from: toStringValue(searchParams?.from),
          to: toStringValue(searchParams?.to),
          showDeleted: toStringValue(searchParams?.showDeleted) === "1",
        }}
      />
    </ProductionRouteShell>
  );
}

function toStringValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) return value[0] ?? fallback;
  if (value === undefined) return fallback;
  return String(value);
}

function ProductionRouteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <Clipboard className="size-4" aria-hidden="true" />
          Voltar para visão geral
        </a>
        {children}
      </div>
    </main>
  );
}
