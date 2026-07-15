import { FileText } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { canManageAccount, chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { foliarFertilizationFilterSchema } from "@/modules/soil-nutrition/domain/schemas";
import { SoilNutritionRepository } from "@/modules/soil-nutrition/infrastructure/supabase/soil-nutrition-repository";
import { FoliarFertilizationsPageClient } from "./foliar-fertilizations-page-client";

function toStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FoliarFertilizationsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;
  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new SoilNutritionRepository(await createClient());
  const parsed = foliarFertilizationFilterSchema.parse({
    propertyId: property.id,
    plotId: toStringValue(searchParams?.plotId),
    plantingId: toStringValue(searchParams?.plantingId),
    seasonId: toStringValue(searchParams?.seasonId),
    purpose: toStringValue(searchParams?.purpose),
    productName: toStringValue(searchParams?.productName),
    from: toStringValue(searchParams?.from),
    to: toStringValue(searchParams?.to),
    showDeleted: toStringValue(searchParams?.showDeleted),
  });
  const [formContext, fertilizations] = await Promise.all([
    repository.getFormContext(property.id),
    repository.listFoliarFertilizations(parsed),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <a href="/soil" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <FileText className="size-4" aria-hidden="true" />
          Voltar para Solo e nutrição
        </a>
        <FoliarFertilizationsPageClient
          canManage={canManageAccount(membership?.role ?? "viewer")}
          propertyId={property.id}
          propertyName={property.name}
          fertilizations={fertilizations}
          context={formContext}
          searchParams={{
            plotId: toStringValue(searchParams?.plotId),
            plantingId: toStringValue(searchParams?.plantingId),
            seasonId: toStringValue(searchParams?.seasonId),
            purpose: toStringValue(searchParams?.purpose),
            productName: toStringValue(searchParams?.productName),
            from: toStringValue(searchParams?.from),
            to: toStringValue(searchParams?.to),
            showDeleted: toStringValue(searchParams?.showDeleted) === "1",
          }}
        />
      </div>
    </main>
  );
}
