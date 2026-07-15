import { canManageAccount } from "@/modules/identity/domain/permissions";
import type { DashboardAction, DashboardSeason, DashboardSummaryInput, DashboardViewModel } from "./types";

const actionLabels: Record<string, string> = {
  chuva: "Registrar chuva",
  irrigacao: "Registrar irrigação",
  producao: "Registrar produção",
  analise_solo: "Registrar análise de solo",
  correcao_solo: "Registrar correção do solo",
  adubacao_solo: "Registrar adubação via solo",
  adubacao_foliar: "Registrar adubação via folha",
  aplicacao: "Registrar aplicação",
  monitoramento: "Registrar monitoramento",
};

function chooseActiveSeason(seasons: DashboardSeason[], preferredSeasonId: string | null) {
  return (
    seasons.find((season) => season.id === preferredSeasonId) ??
    seasons.find((season) => season.status === "open") ??
    seasons.find((season) => season.status === "planning") ??
    seasons[0] ??
    null
  );
}

function operationHref(recordType: string, seasonId?: string | null) {
  if (recordType === "chuva") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/climate/rainfall${query ? `?${query}` : ""}`;
  }
  if (recordType === "irrigacao") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/climate/irrigation${query ? `?${query}` : ""}`;
  }
  if (recordType === "producao") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/production${query ? `?${query}` : ""}`;
  }
  if (recordType === "analise_solo") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/soil/analyses${query ? `?${query}` : ""}`;
  }
  if (recordType === "correcao_solo") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/soil/corrections${query ? `?${query}` : ""}`;
  }
  if (recordType === "adubacao_solo") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/soil/soil-fertilizations${query ? `?${query}` : ""}`;
  }
  if (recordType === "adubacao_foliar") {
    const params = new URLSearchParams();
    if (seasonId) params.set("seasonId", seasonId);
    const query = params.toString();
    return `/soil/foliar-fertilizations${query ? `?${query}` : ""}`;
  }
  const params = new URLSearchParams({ recordType });
  if (seasonId) params.set("seasonId", seasonId);
  return `/operations?${params.toString()}`;
}

function buildQuickActions(canManage: boolean, activeSeason: DashboardSeason | null): DashboardAction[] {
  if (!canManage) {
    return [{ key: "consultar", label: "Consultar operações", description: "Veja o histórico permitido para seu acesso.", href: "/operations", kind: "primary" }];
  }

  return ["chuva", "irrigacao", "producao", "analise_solo", "correcao_solo", "adubacao_solo", "adubacao_foliar"].map((recordType, index) => ({
    key: recordType,
    label: actionLabels[recordType],
    description: recordType === "chuva"
      ? "Informe volume e data da precipitação."
      : recordType === "irrigacao"
        ? "Preencha a ficha de irrigação realizada."
        : recordType === "producao"
          ? "Preencha a produção por talhão e safra."
          : recordType === "analise_solo"
            ? "Lance uma análise e anexe o laudo original."
            : recordType === "correcao_solo"
              ? "Preencha a aplicação de corretivo realizada."
              : recordType === "adubacao_solo"
                ? "Preencha a adubação via solo realizada."
                : recordType === "adubacao_foliar"
                  ? "Registre a aplicação foliar e os componentes da mistura."
                  : "Crie um registro rápido com contexto da propriedade.",
    href: operationHref(recordType, activeSeason?.id),
    kind: index === 0 ? "primary" : "secondary",
  }));
}

function buildRecommendedAction(input: DashboardSummaryInput, activeSeason: DashboardSeason | null, canManage: boolean): DashboardAction {
  if (input.activePlotCount === 0) {
    return { key: "plot", label: "Cadastrar talhão", description: "Comece definindo as áreas produtivas da propriedade.", href: "/structure/plots", kind: "primary" };
  }
  if (input.activePlantingCount === 0) {
    return { key: "planting", label: "Cadastrar lavoura", description: "Informe a lavoura ativa para conectar os registros ao campo.", href: "/structure/plantings", kind: "primary" };
  }
  if (input.seasons.length === 0 || !activeSeason) {
    return { key: "season", label: "Criar safra", description: "Abra uma safra para organizar os registros no tempo.", href: "/structure/seasons", kind: "primary" };
  }
  if (input.plantingSeasonLinkCount === 0) {
    return { key: "link", label: "Vincular lavoura à safra", description: "Conecte a lavoura à safra para preparar os próximos controles.", href: "/structure/seasons", kind: "primary" };
  }
  if (canManage && input.recordsThisMonthCount === 0) {
    return { key: "first-record", label: "Registrar chuva", description: "Crie o primeiro registro operacional deste mês.", href: operationHref("chuva", activeSeason.id), kind: "primary" };
  }
  return { key: "history", label: canManage ? "Novo registro" : "Consultar histórico", description: "Acompanhe as operações recentes da propriedade.", href: "/operations", kind: "primary" };
}

export function buildDashboardViewModel(input: DashboardSummaryInput): DashboardViewModel {
  const canManage = canManageAccount(input.role);
  const activeSeason = chooseActiveSeason(input.seasons, input.preferredSeasonId);
  const hasIncompleteStructure = input.activePlotCount === 0 || input.activePlantingCount === 0 || input.seasons.length === 0 || input.plantingSeasonLinkCount === 0;
  const productionInActiveSeason = activeSeason
    ? input.productionRecords.filter((record) => record.season_id === activeSeason.id).reduce((total, record) => total + Number(record.total_sc ?? 0), 0)
    : 0;

  return {
    activeProperty: input.activeProperty,
    activeSeason,
    role: input.role,
    canManage,
    hasIncompleteStructure,
    seasonOptions: input.seasons,
    recentRecords: input.recentRecords,
    recommendedAction: buildRecommendedAction(input, activeSeason, canManage),
    quickActions: buildQuickActions(canManage, activeSeason),
    metrics: [
      { key: "plots", label: "Talhões ativos", value: String(input.activePlotCount), helper: input.activePlotCount ? "Áreas disponíveis para manejo." : "Cadastre o primeiro talhão." },
      { key: "plantings", label: "Lavouras ativas", value: String(input.activePlantingCount), helper: input.activePlantingCount ? "Lavouras em acompanhamento." : "Cadastre a lavoura ativa." },
      { key: "season", label: "Safra ativa", value: activeSeason?.name ?? "Sem safra", helper: activeSeason ? `Situação: ${activeSeason.status}` : "Crie ou selecione uma safra." },
      { key: "production", label: "Produção na safra", value: `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(productionInActiveSeason)} sc`, helper: productionInActiveSeason ? "Soma da ficha de produção." : "Sem produção registrada na safra." },
      { key: "soil", label: "Análises de solo", value: String(input.soilAnalysisCount), helper: input.soilAnalysisCount ? "Laudos registrados no caderno." : "Sem análise de solo registrada." },
    ],
  };
}
