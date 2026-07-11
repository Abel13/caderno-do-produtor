import { redirect } from "next/navigation";
import { Coffee } from "@/components/icons";
import { OnboardingForm } from "@/modules/identity/presentation/components/onboarding-form";
import { requireUser } from "@/modules/identity/infrastructure/supabase/server-context";

export default async function OnboardingPage() {
  const { repository, user } = await requireUser();
  await repository.acceptPendingInvitations();
  const context = await repository.getContext();
  if (context?.memberships.length) redirect("/dashboard");
  const suggestedName = context?.profile.full_name?.split(" ")[0] ?? user.user_metadata.full_name?.split(" ")[0] ?? "";
  return <main className="min-h-screen bg-[#f7f6f1] px-4 py-10 sm:py-16"><div className="mx-auto max-w-xl"><div className="mb-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-800 text-white"><Coffee aria-hidden="true"/></span><div><p className="font-bold">Caderno do Produtor</p><p className="text-sm text-stone-500">Configuração inicial</p></div></div><section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-sm font-semibold text-emerald-800">BEM-VINDO</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Cadastre sua primeira propriedade</h1><p className="mt-3 text-stone-600">Essas informações criam o contexto usado nos registros, relatórios e recomendações técnicas.</p><div className="mt-8"><OnboardingForm suggestedName={suggestedName}/></div></section></div></main>;
}
