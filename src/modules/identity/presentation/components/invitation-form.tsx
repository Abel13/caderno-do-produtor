"use client";

import type { IdentityProperty } from "../../domain/types";
import { FormField, SelectField } from "@/components/atoms/form-field";
import { Button } from "@/components/ui/button";
import { Loader, UserPlus } from "@/components/icons";
import { useAccessViewModel } from "../view-models/use-access-view-model";

export function InvitationForm({ accountId, properties, canInviteManager }: { accountId: string; properties: IdentityProperty[]; canInviteManager: boolean }) {
  const { role, setRole, state, action, pending, fieldError } = useAccessViewModel();
  return <form action={action} className="space-y-5" noValidate><input type="hidden" name="accountId" value={accountId}/><FormField label="E-mail Google" name="email" type="email" autoComplete="email" placeholder="tecnico@exemplo.com" error={fieldError("email")} required/><SelectField label="Papel" name="role" value={role} onChange={(event) => setRole(event.target.value as "manager" | "technician")}><option value="technician">Técnico</option>{canInviteManager && <option value="manager">Gestor da conta</option>}</SelectField>{role === "technician" && <fieldset><legend className="text-sm font-semibold text-stone-700">Propriedades autorizadas</legend><div className="mt-3 space-y-2">{properties.map((property) => <label key={property.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 p-3"><input type="checkbox" name="propertyIds" value={property.id} className="size-4 accent-emerald-700"/><span className="text-sm font-medium">{property.name}</span></label>)}</div>{fieldError("propertyIds") && <p className="mt-2 text-sm text-red-700">{fieldError("propertyIds")}</p>}</fieldset>}<p className="text-xs text-stone-500">O sistema não envia e-mail. Avise a pessoa para entrar usando exatamente esse endereço Google.</p>{state.message && <p role="status" className={state.status === "error" ? "rounded-xl bg-red-50 p-3 text-sm text-red-800" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"}>{state.message}</p>}<Button className="w-full" disabled={pending}>{pending ? <Loader className="size-5 animate-spin" aria-hidden="true"/> : <UserPlus className="size-5" aria-hidden="true"/>}{pending ? "Criando convite..." : "Criar convite pendente"}</Button></form>;
}
