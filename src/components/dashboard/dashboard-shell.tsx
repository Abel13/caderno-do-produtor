import { Activity, Bell, CloudRain, Coffee, FileText, Home, Plus, Settings, TrendingUp, Users, Clipboard } from "@/components/icons";
import { SystemAlert } from "@/components/atoms/system-alert";
import { PropertySelector } from "@/components/molecules/property-selector";
import { SeasonSelector } from "@/components/molecules/season-selector";
import { accountRoleLabel } from "@/modules/identity/domain/permissions";
import type { IdentityContext } from "@/modules/identity/domain/types";
import type { DashboardAction, DashboardMetric, DashboardRecentRecord, DashboardViewModel } from "@/modules/dashboard/domain/types";

const recordTypeLabel: Record<string, string> = {
  chuva: "Chuva",
  clima_diario: "Clima diário",
  irrigacao: "Irrigação",
  producao: "Produção",
  fertilizacao: "Fertilização",
  aplicacao: "Aplicação",
  monitoramento: "Monitoramento",
};

export function DashboardShell({ context, dashboard }: { context: IdentityContext; dashboard: DashboardViewModel }) {
  const activeProperty = dashboard.activeProperty;
  const firstName = context.profile.full_name?.split(" ")[0] ?? "produtor";
  const membership = context.memberships.find((item) => item.account_id === activeProperty.account_id);
  const roleLabel = accountRoleLabel(dashboard.role);

  return (
    <div className="min-h-screen bg-[#f7f6f1] text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f7f6f1]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2 font-bold">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-800 text-white">
              <Coffee className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Caderno do Produtor</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="text-xs text-stone-500">{membership?.account_name}</p>
              <p className="text-sm font-bold text-emerald-800">{roleLabel}</p>
            </div>
            <PropertySelector properties={context.properties} activeId={activeProperty.id} />
            <button aria-label="Notificações" className="relative grid size-11 place-items-center rounded-xl border border-stone-200 bg-white">
              <Bell className="size-5" aria-hidden="true" />
              {context.profile.internal_notifications_enabled && <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-stone-200 p-4 lg:block">
          <div className="mb-4 rounded-xl bg-white p-3">
            <p className="text-xs text-stone-500">Seu acesso</p>
            <p className="mt-1 font-bold text-emerald-800">{roleLabel}</p>
          </div>
          <nav className="space-y-1 text-sm font-medium">
            <Nav href="/dashboard" Icon={Home}>Visão geral</Nav>
            <Nav href="/operations" Icon={Clipboard}>Histórico interno</Nav>
            <Nav href="/structure" Icon={Coffee}>Estrutura rural</Nav>
            <Nav href="/climate" Icon={CloudRain}>Clima e água</Nav>
            <Nav href="/production" Icon={TrendingUp}>Produção</Nav>
            <Nav href="#" Icon={FileText}>Documentos</Nav>
            {dashboard.canManage && <Nav href="/settings/access" Icon={Users}>Acessos</Nav>}
            <Nav href="/settings/profile" Icon={Settings}>Configurações</Nav>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:py-10">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-stone-500">{activeProperty.city} · {activeProperty.state}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900 md:hidden">{roleLabel}</span>
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Olá, {firstName}</h1>
              <p className="mt-2 text-stone-600">Acompanhe {activeProperty.name} e registre o que aconteceu no campo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {dashboard.seasonOptions.length > 0 ? (
                <SeasonSelector seasons={dashboard.seasonOptions} activeId={dashboard.activeSeason?.id ?? null} />
              ) : (
                <a href="/structure/seasons" className="inline-flex h-11 items-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-emerald-800">
                  Criar safra
                </a>
              )}
              <a href={dashboard.recommendedAction.href} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800">
                <Plus className="size-4" aria-hidden="true" />
                {dashboard.recommendedAction.label}
              </a>
            </div>
          </section>

          {!dashboard.canManage && (
            <SystemAlert tone="warning" className="mt-5">
              Acesso para consulta: você pode acompanhar a propriedade, mas não criar ou alterar registros operacionais.
            </SystemAlert>
          )}

          {dashboard.hasIncompleteStructure && (
            <SystemAlert tone="info" className="mt-5">
              {dashboard.recommendedAction.description}
            </SystemAlert>
          )}

          <section className="mt-6 rounded-2xl bg-emerald-900 p-5 text-white shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-emerald-200">PRÓXIMA AÇÃO</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{dashboard.recommendedAction.label}</h2>
                <p className="mt-1 max-w-xl text-sm text-emerald-100">{dashboard.recommendedAction.description}</p>
              </div>
              <a href={dashboard.recommendedAction.href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-stone-800">
                Abrir
              </a>
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Ações rápidas</h2>
                <p className="text-sm text-stone-500">Comece pelo tipo de registro que o produtor reconhece no campo.</p>
              </div>
              <a href="/operations" className="text-sm font-semibold text-emerald-800">Ver operações</a>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dashboard.quickActions.map((action) => <QuickAction key={action.key} action={action} />)}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-emerald-800" aria-hidden="true" />
              <h2 className="text-lg font-bold">Registros recentes</h2>
            </div>
            {dashboard.recentRecords.length ? (
              <div className="mt-4 divide-y divide-stone-100">
                {dashboard.recentRecords.map((record) => <RecentRecord key={record.id} record={record} />)}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
                Ainda não há registros nesta propriedade. Use uma ação rápida para começar pelo que aconteceu hoje.
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function Nav({ href, Icon, children }: { href: string; Icon: typeof Home; children: React.ReactNode }) {
  return (
    <a href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-stone-600 transition hover:bg-white hover:text-emerald-900">
      <Icon className="size-5" aria-hidden="true" />
      {children}
    </a>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{metric.label}</p>
      <p className="mt-1 text-2xl font-bold">{metric.value}</p>
      <p className="mt-2 text-xs text-stone-500">{metric.helper}</p>
    </article>
  );
}

function QuickAction({ action }: { action: DashboardAction }) {
  const primary = action.kind === "primary";
  return (
    <a
      href={action.href}
      className={primary ? "rounded-xl bg-emerald-700 p-4 text-white transition hover:bg-emerald-800" : "rounded-xl border border-stone-200 bg-stone-50 p-4 text-stone-800 transition hover:bg-white"}
    >
      <p className="font-bold">{action.label}</p>
      <p className={primary ? "mt-1 text-sm text-emerald-50" : "mt-1 text-sm text-stone-500"}>{action.description}</p>
    </a>
  );
}

function RecentRecord({ record }: { record: DashboardRecentRecord }) {
  return (
    <article className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{recordTypeLabel[record.record_type] ?? record.record_type}</p>
        <p className="text-xs text-stone-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(record.occurred_at))}</p>
      </div>
      <p className="mt-1 text-sm text-stone-600">{record.notes || payloadSummary(record.payload) || "Registro operacional sem observação."}</p>
    </article>
  );
}

function payloadSummary(payload: Record<string, unknown> | null) {
  const value = payload?.value;
  const unit = payload?.value_unit;
  if (typeof value === "number") return `${value} ${typeof unit === "string" ? unit : ""}`.trim();
  return typeof payload?.comment === "string" ? payload.comment : "";
}
