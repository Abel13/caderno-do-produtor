/* eslint-disable @typescript-eslint/ban-ts-comment */
// Static presentation data; runtime pages will replace these placeholders with typed database queries.
// @ts-nocheck
"use client";

import { useState } from "react";
import { Bell, CalendarDays, ChevronDown, CloudRain, FileClock, Leaf, Menu, Plus, Sprout, TrendingUp, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatArea } from "@/lib/utils";

const plots = [
  { name: "Talhão Norte", area: 4.8, cultivar: "Catuaí Vermelho 144", state: "Em produção", progress: 72 },
  { name: "Talhão Baixada", area: 3.2, cultivar: "Arara", state: "Em formação", progress: 41 },
  { name: "Talhão Sede", area: 2.5, cultivar: "Mundo Novo", state: "Em produção", progress: 64 }
];

export function DashboardShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f7f6f1] text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f7f6f1]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button aria-label="Abrir menu" className="rounded-lg p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button>
          <div className="flex items-center gap-2 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-emerald-800 text-white"><Leaf className="size-5" /></span><span>Caderno do Produtor</span></div>
          <button className="ml-auto flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"><span className="hidden sm:inline">Fazenda Boa Vista</span><span className="sm:hidden">Boa Vista</span><ChevronDown className="size-4" /></button>
          <button aria-label="Notificações" className="relative rounded-xl border border-stone-200 bg-white p-2.5"><Bell className="size-5"/><span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500" /></button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className={cn("fixed inset-y-16 left-0 z-10 w-64 border-r border-stone-200 bg-[#f7f6f1] p-4 transition lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)]", menuOpen ? "block" : "hidden")}>
          <nav className="space-y-1 text-sm font-medium">
            {[[TrendingUp,"Visão geral"],[Sprout,"Talhões"],[CalendarDays,"Atividades"],[CloudRain,"Clima e água"],[FileClock,"Documentos"]].map(([Icon,label], i) => <a key={String(label)} href="#" className={cn("flex items-center gap-3 rounded-xl px-3 py-3", i === 0 ? "bg-emerald-100 text-emerald-900" : "text-stone-600 hover:bg-white")}><Icon className="size-5" />{label}</a>)}
          </nav>
          <div className="absolute bottom-5 left-4 right-4 rounded-2xl bg-emerald-900 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Safra atual</p><p className="mt-1 text-xl font-bold">2026/2027</p><p className="mt-2 text-xs text-emerald-100">Aberta · 10,5 hectares</p></div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-stone-500">Sábado, 11 de julho</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Bom dia, produtor</h1><p className="mt-2 text-stone-600">Acompanhe sua safra e registre o trabalho de hoje.</p></div><Button size="lg"><Plus className="size-5"/>Novo registro</Button></div>

          <section aria-labelledby="production" className="mt-8 overflow-hidden rounded-3xl bg-emerald-900 text-white shadow-sm">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]"><div><p className="text-sm font-semibold text-emerald-200">PRODUÇÃO DA SAFRA</p><h2 id="production" className="mt-2 text-3xl font-bold sm:text-4xl">742 sacas estimadas</h2><p className="mt-2 text-emerald-100">Combinação entre histórico e amostragem de campo</p><div className="mt-8 grid grid-cols-3 gap-3"><Metric label="Colhido" value="184 sc"/><Metric label="Progresso" value="25%"/><Metric label="Produtividade" value="70,7 sc/ha"/></div></div><div className="rounded-2xl bg-white/10 p-5"><div className="flex items-center justify-between text-sm"><span>Meta da safra</span><b>800 sacas</b></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[25%] rounded-full bg-amber-400"/></div><div className="mt-6 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-white/10"><Wheat/></div><div><p className="font-semibold">Próxima atualização</p><p className="text-sm text-emerald-100">Amostragem em 8 dias</p></div></div></div></div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickCard icon={CloudRain} title="Chuva no mês" value="86 mm" detail="12 mm nos últimos 7 dias"/>
            <QuickCard icon={CalendarDays} title="Próximas atividades" value="4" detail="2 previstas para esta semana"/>
            <QuickCard icon={Leaf} title="Talhões ativos" value="3" detail="10,5 hectares cultivados"/>
            <QuickCard icon={FileClock} title="Documentos" value="1" detail="Laudo aguardando revisão" alert/>
          </section>

          <section className="mt-8"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Situação dos talhões</h2><p className="mt-1 text-sm text-stone-500">Produção e manejo na safra atual</p></div><Button variant="ghost" size="sm">Ver todos</Button></div><div className="mt-4 grid gap-4 lg:grid-cols-3">{plots.map(plot => <article key={plot.name} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Sprout className="size-5"/></span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">{plot.state}</span></div><h3 className="mt-4 font-bold">{plot.name}</h3><p className="mt-1 text-sm text-stone-500">{formatArea(plot.area)} · {plot.cultivar}</p><div className="mt-5 flex items-center justify-between text-xs"><span className="text-stone-500">Estimativa atualizada</span><b>{plot.progress}%</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-600" style={{width:`${plot.progress}%`}}/></div></article>)}</div></section>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-emerald-200">{label}</p><p className="mt-1 text-lg font-bold sm:text-xl">{value}</p></div>; }
function QuickCard({ icon: Icon, title, value, detail, alert = false }: { icon: typeof Leaf; title: string; value: string; detail: string; alert?: boolean }) { return <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="size-5"/></span>{alert && <span className="size-2 rounded-full bg-amber-500"/>}</div><p className="mt-4 text-sm text-stone-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-stone-500">{detail}</p></article>; }
