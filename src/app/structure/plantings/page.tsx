import { redirect } from "next/navigation";

import { SystemAlert } from "@/components/atoms/system-alert";
import { createClient } from "@/lib/supabase/server";
import { chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { RuralStructureRepository } from "@/modules/rural-structure/infrastructure/supabase/rural-structure-repository";
import { DeletePlantingButton } from "@/modules/rural-structure/presentation/components/delete-planting-button";
import { EditPlantingPhase } from "@/modules/rural-structure/presentation/components/edit-planting-phase";
import { LinkPlantingSeason } from "@/modules/rural-structure/presentation/components/link-planting-season";
import { StructureForms } from "@/modules/rural-structure/presentation/components/structure-forms";

export default async function PlantingsPage() {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) redirect("/structure");

  const data = await new RuralStructureRepository(await createClient()).overview(property.id);
  const role = context.memberships.find((m) => m.account_id === property.account_id)?.role;
  const canWrite = role === "owner" || role === "manager";

  const plantings = data.plots.flatMap((plot) => plot.plantings.map((planting) => ({ plot, planting })));

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <a href="/structure" className="inline-flex min-h-11 items-center text-emerald-800">
          ← Visão geral
        </a>

        <h1 className="mt-5 text-3xl font-bold">Lavouras</h1>
        <p className="mt-2 text-stone-600">Veja onde está plantada, a área ocupada e a fase atual de cada lavoura.</p>

        {plantings.length ? (
          <div className="mt-6 space-y-4">
            {plantings.map(({ plot, planting }) => (
              <article key={planting.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-800">{plot.name}</p>
                    <h2 className="mt-1 text-xl font-bold">{planting.cultivar?.name ?? "Cultivar não informada"}</h2>
                  </div>
                  <div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      {phaseMeta(planting.status).label}
                    </span>
                    <p className="mt-1 text-xs text-stone-500">{phaseMeta(planting.status).description}</p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-stone-100 py-4 sm:grid-cols-4">
                  <Info label="Área plantada" value={`${planting.planted_area_ha} ha`} />
                  <Info
                    label="Plantio"
                    value={
                      planting.planted_on
                        ? formatDate(planting.planted_on)
                        : planting.planted_year
                          ? String(planting.planted_year)
                          : "Não informado"
                    }
                  />
                  <Info
                    label="Espaçamento"
                    value={
                      planting.spacing_between_rows_m && planting.spacing_between_plants_m
                        ? `${planting.spacing_between_rows_m} × ${planting.spacing_between_plants_m} m`
                        : "Não informado"
                    }
                  />
                  <Info
                    label="Plantas estimadas"
                    value={
                      planting.estimated_plants
                        ? new Intl.NumberFormat("pt-BR").format(planting.estimated_plants)
                        : "Não informado"
                    }
                  />
                </dl>

                {(planting.cultivation_system || planting.seedling_origin) && (
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {planting.cultivation_system && <p><strong>Sistema:</strong> {planting.cultivation_system}</p>}
                    {planting.seedling_origin && <p><strong>Origem das mudas:</strong> {planting.seedling_origin}</p>}
                  </div>
                )}

                {canWrite ? (
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
                    <EditPlantingPhase plantingId={planting.id} currentStatus={planting.status} />
                    <DeletePlantingButton plantingId={planting.id} />
                    <LinkPlantingSeason
                      plantingId={planting.id}
                      plantingAreaHa={planting.planted_area_ha}
                      plantingStatus={planting.status}
                      seasons={data.seasons}
                    />
                  </div>
                ) : (
                  <SystemAlert tone="warning" className="mt-4">
                    Acesso para consulta. Somente proprietário e gestor podem vincular e alterar lavouras.
                  </SystemAlert>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-white p-5 text-sm text-stone-600">Nenhuma lavoura cadastrada.</p>
        )}

        {canWrite ? (
          <StructureForms
            propertyId={property.id}
            plots={data.plots}
            cultivars={data.cultivars}
            hasSeason={data.seasons.length > 0}
            initialStep="planting"
          />
        ) : (
          <SystemAlert tone="warning" className="mt-6">
            Acesso para consulta. Você não pode alterar lavouras.
          </SystemAlert>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-stone-800">{value}</dd>
    </div>
  );
}

function phaseMeta(status: string) {
  return status === "forming"
    ? { label: "Formação", description: "Lavoura jovem em implantação, ainda sem produção estável." }
    : status === "productive"
      ? { label: "Produção", description: "Lavoura ativa, gerando operações e acompanhamento produtivo." }
      : status === "renewing"
        ? { label: "Renovação", description: "Em ciclo de recuperação para voltar ao padrão produtivo." }
        : { label: "Encerrada", description: "Lavoura sem ciclo ativo no momento." };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}
