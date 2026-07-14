import { FileText } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { canManageAccount, chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { SoilNutritionRepository } from "@/modules/soil-nutrition/infrastructure/supabase/soil-nutrition-repository";
import { formatSoilDecimal, summarizeSoilAnalyses, summarizeSoilCorrections, summarizeSoilFertilizations } from "@/modules/soil-nutrition/domain/rules";

export default async function SoilPage() {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) return <main className="p-8">Nenhuma propriedade ativa encontrada.</main>;
  const membership = context.memberships.find((item) => item.account_id === property.account_id);
  const repository = new SoilNutritionRepository(await createClient());
  const [analyses, corrections, fertilizations] = await Promise.all([
    repository.listAnalyses({ propertyId: property.id, showDeleted: false }),
    repository.listCorrections({ propertyId: property.id, showDeleted: false }),
    repository.listFertilizations({ propertyId: property.id, showDeleted: false }),
  ]);
  const summary = summarizeSoilAnalyses(analyses);
  const correctionSummary = summarizeSoilCorrections(corrections);
  const fertilizationSummary = summarizeSoilFertilizations(fertilizations);
  const canManage = canManageAccount(membership?.role ?? "viewer");

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-emerald-800">
          <FileText className="size-4" aria-hidden="true" />
          Voltar para visão geral
        </a>
        <section className="mt-6 rounded-2xl bg-emerald-900 p-5 text-white">
          <p className="text-sm font-semibold text-emerald-100">SOLO E NUTRIÇÃO</p>
          <h1 className="mt-1 text-3xl font-bold">Fichas de solo</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50">
            Preencha análises, correções e adubações via solo como fichas do caderno, com histórico por talhão e safra.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/soil/analyses" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-stone-800">
              {canManage ? "Registrar análise de solo" : "Consultar análises"}
            </a>
            <a href="/soil/corrections" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white ring-1 ring-emerald-300">
              {canManage ? "Registrar correção" : "Consultar correções"}
            </a>
            <a href="/soil/soil-fertilizations" className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-stone-800">
              {canManage ? "Registrar adubação via solo" : "Consultar adubações"}
            </a>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Análises registradas" value={String(summary.analysesCount)} helper="Registros ativos da propriedade." />
          <Metric label="Laudos anexados" value={String(summary.reportsCount)} helper="Arquivos guardados no Storage privado." />
          <Metric label="Correções registradas" value={String(correctionSummary.correctionsCount)} helper={`${formatSoilDecimal(correctionSummary.totalQuantityT)} t de corretivo registradas.`} />
          <Metric label="Adubações via solo" value={String(fertilizationSummary.fertilizationsCount)} helper={`${formatSoilDecimal(fertilizationSummary.totalQuantityKg)} kg de insumo registrados.`} />
        </section>

        <section className="mt-4 rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-bold">Próxima evolução planejada</h2>
          <p className="mt-2 text-sm text-stone-600">
            A importação de PDF/OCR ficará como 6A.2. Por enquanto, o laudo pode ser anexado e os dados são conferidos manualmente antes de virar ficha definitiva.
          </p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-stone-500">{helper}</p>
    </article>
  );
}
