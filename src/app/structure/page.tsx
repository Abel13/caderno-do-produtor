import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import { chooseActiveProperty } from "@/modules/identity/domain/permissions";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { structureChecklist } from "@/modules/rural-structure/domain/progress";
import { RuralStructureRepository } from "@/modules/rural-structure/infrastructure/supabase/rural-structure-repository";
import { StructureForms } from "@/modules/rural-structure/presentation/components/structure-forms";

export default async function StructurePage() {
  const { context } = await requireIdentityContext();
  const property = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!property) redirect("/onboarding");
  const data = await new RuralStructureRepository(await createClient()).overview(property.id);
  const plantings = data.plots.flatMap((plot) => plot.plantings);
  const checklist = structureChecklist({ plots: data.plots.length, plantings: plantings.length, seasons: data.seasons.length, links: data.linkCount });
  return <main className="min-h-screen bg-[#f7f6f1] px-4 py-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-emerald-800"><ArrowRight className="size-4 rotate-180" aria-hidden="true"/>Voltar ao dashboard</Link><p className="mt-6 text-sm font-semibold text-emerald-800">ESTRUTURA DA PROPRIEDADE</p><h1 className="mt-1 text-3xl font-bold">Prepare {property.name} para os registros</h1><p className="mt-2 max-w-2xl text-stone-600">Siga os passos no seu ritmo. O que já foi cadastrado fica salvo e você pode continuar depois.</p><section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-bold">Seu progresso</h2><ol className="mt-4 grid gap-3 sm:grid-cols-5">{checklist.map((item,index) => <li key={item.key} className="flex items-start gap-3 sm:block"><span className={item.done?"grid size-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-white":"grid size-7 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-bold text-stone-500"}>{item.done?<Check className="size-4" aria-hidden="true"/>:index+1}</span><p className="text-sm font-semibold sm:mt-2">{item.label}</p></li>)}</ol></section><StructureForms propertyId={property.id} plots={data.plots} cultivars={data.cultivars} hasSeason={data.seasons.length>0}/><section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-800">VISÃO GERAL</p><h2 className="mt-1 text-xl font-bold">Talhões cadastrados</h2></div><span className="text-sm text-stone-500">{data.plots.length} no total</span></div>{data.plots.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.plots.map((plot) => <article key={plot.id} className="rounded-xl border border-stone-200 p-4"><p className="font-bold">{plot.name}</p><p className="mt-1 text-sm text-stone-600">{plot.area_ha} hectares</p><p className="mt-3 text-xs font-semibold text-emerald-800">{plot.plantings[0]?.cultivar?.name ?? (plot.plantings.length ? "Cultivar não informada" : "Aguardando cadastro da lavoura")}</p></article>)}</div> : <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">Nenhum talhão ainda. Use o passo 1 acima para começar.</p>}</section></div></main>;
}
