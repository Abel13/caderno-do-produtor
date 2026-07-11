"use client";

import { Button } from "@/components/ui/button";
import { FormField, SelectField } from "@/components/atoms/form-field";
import { ArrowRight, Loader } from "@/components/icons";
import { useOnboardingViewModel } from "../view-models/use-onboarding-view-model";

const states = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export function OnboardingForm({ suggestedName }: { suggestedName: string }) {
  const { state, action, pending, fieldError } = useOnboardingViewModel();
  return <form action={action} className="space-y-5" noValidate>
    <FormField label="Nome da conta" name="accountName" defaultValue={suggestedName ? `Conta de ${suggestedName}` : ""} error={fieldError("accountName")} autoComplete="organization" required />
    <FormField label="Nome da propriedade" name="propertyName" placeholder="Ex.: Fazenda Boa Vista" error={fieldError("propertyName")} required />
    <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
      <FormField label="Município" name="city" error={fieldError("city")} autoComplete="address-level2" required />
      <SelectField label="UF" name="state" error={fieldError("state")} defaultValue="" required><option value="" disabled>Selecione</option>{states.map((stateName) => <option key={stateName}>{stateName}</option>)}</SelectField>
    </div>
    <FormField label="Área total (ha)" name="totalAreaHa" inputMode="decimal" placeholder="Opcional" error={fieldError("totalAreaHa")} hint="Você poderá complementar essa informação depois." />
    {state.message && <div role="alert" className={state.status === "error" ? "rounded-xl bg-red-50 p-3 text-sm text-red-800" : "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"}>{state.message}</div>}
    <Button size="lg" className="w-full" disabled={pending}>{pending ? <Loader className="size-5 animate-spin" aria-hidden="true"/> : <ArrowRight className="size-5" aria-hidden="true"/>}{pending ? "Criando sua conta..." : "Criar propriedade e continuar"}</Button>
  </form>;
}
