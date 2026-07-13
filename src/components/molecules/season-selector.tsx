"use client";

import { setActiveSeasonAction } from "@/modules/identity/presentation/actions";
import type { DashboardSeason } from "@/modules/dashboard/domain/types";

export function SeasonSelector({ seasons, activeId }: { seasons: DashboardSeason[]; activeId: string | null }) {
  return (
    <form action={setActiveSeasonAction}>
      <label htmlFor="active-season" className="sr-only">Safra ativa</label>
      <select
        id="active-season"
        name="seasonId"
        defaultValue={activeId ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-11 max-w-48 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold shadow-sm outline-none focus:ring-2 focus:ring-emerald-600"
      >
        <option value="">Sem safra ativa</option>
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
    </form>
  );
}
