import Link from "next/link";
import { redirect } from "next/navigation";

import { SystemAlert } from "@/components/atoms/system-alert";
import { ArrowRight } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { RuralStructureRepository } from "@/modules/rural-structure/infrastructure/supabase/rural-structure-repository";
import { StructureForms } from "@/modules/rural-structure/presentation/components/structure-forms";
import { EditSeasonStatus } from "@/modules/rural-structure/presentation/components/edit-season-status";

function seasonStatusLabel(status: string) {
  return status === "open" ? "Aberta para registros" : status === "closed" ? "Encerrada (somente consulta)" : "Em planejamento";
}

function seasonStatusDescription(status: string) {
  return status === "open"
    ? "Ciclo produtivo ativo: use para registrar operações."
    : status === "closed"
      ? "Ciclo encerrado. Use a reabertura só com justificativa."
      : "Planejamento inicial: preparação antes dos registros de produção.";
}

export default async function SeasonsPage() {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) redirect("/structure");

  const data = await new RuralStructureRepository(await createClient()).overview(property.id);
  const role = context.memberships.find((item) => item.account_id === property.account_id)?.role;
  const canWrite = role === "owner" || role === "manager";
  const canReopen = role === "owner";

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/structure" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
          Visão geral
        </Link>
        <h1 className="mt-5 text-3xl font-bold">Safras de {property.name}</h1>
        <p className="mt-2 text-stone-600">Confira os ciclos cadastrados, a situação atual e como cada safra deve ser usada.</p>

        <section className="mt-6 rounded-2xl border bg-white p-5">
          {data.seasons.length ? (
            <div className="divide-y">
              {data.seasons.map((season) => (
                <article key={season.id} className="py-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{season.name}</h2>
                      <p className="text-sm text-stone-500">
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(`${season.starts_on}T12:00:00`))} até{" "}
                        {new Intl.DateTimeFormat("pt-BR").format(new Date(`${season.ends_on}T12:00:00`))}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-emerald-800">{seasonStatusLabel(season.status)}</span>
                      <p className="text-xs text-stone-600">{seasonStatusDescription(season.status)}</p>
                    </div>
                  </div>

                  {canWrite ? (
                    <div className="mt-3">
                      <EditSeasonStatus seasonId={season.id} currentStatus={season.status} canReopen={canReopen} />
                    </div>
                  ) : (
                    <SystemAlert tone="warning" className="mt-3">
                      Acesso para consulta. Apenas proprietário e gestor podem alterar situação de safra.
                    </SystemAlert>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-600">Nenhuma safra cadastrada.</p>
          )}
        </section>

        {canWrite ? (
          <StructureForms
            propertyId={property.id}
            plots={data.plots}
            cultivars={data.cultivars}
            hasSeason={data.seasons.length > 0}
            initialStep="season"
          />
        ) : (
          <SystemAlert tone="warning" className="mt-6">
            Acesso para consulta. Você não pode cadastrar ou alterar safras.
          </SystemAlert>
        )}
      </div>
    </main>
  );
}
