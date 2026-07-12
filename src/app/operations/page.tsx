import Link from "next/link";

import { Calendar } from "@/components/icons";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { chooseActiveProperty, canManageAccount } from "@/modules/identity/domain/permissions";
import { OperationsRepository } from "@/modules/operations/infrastructure/supabase/operations-repository";
import { resolveOperationFilters } from "@/modules/operations/application/use-cases";
import { OperationsPageClient } from "./components/operations-page-client";
import { createClient } from "@/lib/supabase/server";

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;

  const membership = context.memberships.find((membership) => membership.account_id === property.account_id);
  const canManage = canManageAccount(membership?.role ?? "viewer");
  const supabase = await createClient();
  const repository = new OperationsRepository(supabase);
  const formContext = await repository.getFormContext(property.id);

  const rawSearchParams = {
    propertyId: property.id,
    recordType: toStringValue(searchParams?.recordType),
    seasonId: toStringValue(searchParams?.seasonId),
    plotId: toStringValue(searchParams?.plotId),
    status: toStringValue(searchParams?.status),
    from: toStringValue(searchParams?.from),
    to: toStringValue(searchParams?.to),
    page: Number(toStringValue(searchParams?.page, "1")),
    limit: Number(toStringValue(searchParams?.limit, "20")),
    showDeleted: toStringValue(searchParams?.showDeleted) === "1",
  };

  const list = await repository.listRecords(resolveOperationFilters(rawSearchParams));

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <Calendar className="size-4 rotate-180" aria-hidden="true" />
          Voltar para dashboard
        </Link>

        <header className="mt-6">
          <p className="text-sm font-semibold text-emerald-800">REGISTROS OPERACIONAIS</p>
          <h1 className="mt-1 text-3xl font-bold">Operações de campo</h1>
          <p className="mt-2 text-stone-600">
            Registre chuva, irrigação, aplicações e observações para alimentar o histórico da propriedade e do sistema.
          </p>
        </header>

        <OperationsPageClient
          canManage={canManage}
          propertyId={property.id}
          propertyName={property.name}
          records={list.records}
          total={list.total}
          recordTypes={formContext.recordTypes}
          plots={formContext.plots}
          plantings={formContext.plantings}
          seasons={formContext.seasons}
          searchParams={{
            recordType: toStringValue(searchParams?.recordType),
            seasonId: toStringValue(searchParams?.seasonId),
            plotId: toStringValue(searchParams?.plotId),
            status: toStringValue(searchParams?.status),
            from: toStringValue(searchParams?.from),
            to: toStringValue(searchParams?.to),
            showDeleted: searchParams?.showDeleted === "1" || searchParams?.showDeleted === "true",
          }}
        />
      </div>
    </main>
  );
}

function toStringValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) return value[0] ?? fallback;
  if (value === undefined) return fallback;
  return String(value);
}
