"use client";

import { FormField, SelectField } from "@/components/atoms/form-field";
import { Loader, Save } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { IdentityProfile } from "../../domain/types";
import { useProfileViewModel } from "../view-models/use-profile-view-model";

export function ProfileForm({ profile }: { profile: IdentityProfile }) {
  const { state, action, pending, fieldError } = useProfileViewModel();
  return <form action={action} className="space-y-6" noValidate>
    <FormField label="Nome de exibição" name="fullName" defaultValue={profile.full_name ?? ""} autoComplete="name" error={fieldError("fullName")} required/>
    <SelectField label="Fuso horário" name="timezone" defaultValue={profile.timezone} error={fieldError("timezone")}>
      <option value="America/Sao_Paulo">Brasília</option><option value="America/Manaus">Manaus</option><option value="America/Cuiaba">Cuiabá</option><option value="America/Rio_Branco">Rio Branco</option><option value="America/Noronha">Fernando de Noronha</option>
    </SelectField>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-sm font-semibold">Unidades e moeda</p><p className="mt-1 text-sm text-stone-600">Sistema métrico · hectares, quilogramas e litros · Real brasileiro (BRL)</p></div>
    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 p-4"><input name="internalNotificationsEnabled" type="checkbox" defaultChecked={profile.internal_notifications_enabled} className="mt-1 size-4 accent-emerald-700"/><span><span className="block text-sm font-semibold">Notificações internas</span><span className="mt-1 block text-xs text-stone-500">Mostrar avisos e pendências dentro do Caderno do Produtor.</span></span></label>
    {state.message && <p role="status" className={state.status === "error" ? "rounded-xl bg-red-50 p-3 text-sm text-red-800" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"}>{state.message}</p>}
    <Button disabled={pending}>{pending ? <Loader className="size-5 animate-spin" aria-hidden="true"/> : <Save className="size-5" aria-hidden="true"/>}{pending ? "Salvando..." : "Salvar preferências"}</Button>
  </form>;
}
