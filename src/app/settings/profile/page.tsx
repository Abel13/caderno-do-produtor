import Link from "next/link";
import { ArrowRight, LogOut, Settings } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { ProfileForm } from "@/modules/identity/presentation/components/profile-form";
import { signOutAction } from "@/modules/identity/presentation/actions";

export default async function ProfileSettingsPage() {
  const { context } = await requireIdentityContext();
  return <main className="min-h-screen bg-[#f7f6f1] px-4 py-8 sm:px-6"><div className="mx-auto max-w-2xl"><Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowRight className="size-4 rotate-180" aria-hidden="true"/>Voltar ao dashboard</Link><div className="mt-6 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-800 text-white"><Settings aria-hidden="true"/></span><div><h1 className="text-3xl font-bold">Perfil e preferências</h1><p className="text-stone-500">Configurações pessoais usadas em todas as propriedades.</p></div></div><section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><ProfileForm profile={context.profile}/></section><section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Sessão</h2><p className="mt-1 text-sm text-stone-500">Encerre o acesso neste dispositivo.</p><form action={signOutAction} className="mt-4"><Button variant="secondary"><LogOut className="size-5" aria-hidden="true"/>Sair</Button></form></section></div></main>;
}
