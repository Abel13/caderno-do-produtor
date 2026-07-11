"use client";

import type { IdentityProperty } from "@/modules/identity/domain/types";
import { setActivePropertyAction } from "@/modules/identity/presentation/actions";

export function PropertySelector({ properties, activeId }: { properties: IdentityProperty[]; activeId: string }) {
  return <form action={setActivePropertyAction}><label htmlFor="active-property" className="sr-only">Propriedade ativa</label><select id="active-property" name="propertyId" defaultValue={activeId} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="h-11 max-w-48 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold shadow-sm outline-none focus:ring-2 focus:ring-emerald-600">{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></form>;
}
