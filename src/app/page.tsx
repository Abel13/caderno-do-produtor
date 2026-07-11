import { redirect } from "next/navigation";
import { ArrowRight, CloudRain, Coffee, FileText, Smartphone } from "@/components/icons";
import { GoogleLogin } from "@/components/auth/google-login";
import { createClient } from "@/lib/supabase/server";

const features = [
  { Icon: CloudRain, label: "Chuva", value: "Acompanhamento por propriedade" },
  { Icon: Smartphone, label: "Campo", value: "Registros pelo celular" },
  { Icon: FileText, label: "Técnico", value: "Recomendações acompanhadas" }
];

export default async function HomePage() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return <main className="min-h-screen overflow-hidden bg-[#f7f6f1]"><div className="mx-auto max-w-7xl px-5 sm:px-8"><nav className="flex h-20 items-center justify-between"><div className="flex items-center gap-2 font-bold"><span className="grid size-10 place-items-center rounded-xl bg-emerald-800 text-white"><Coffee aria-hidden="true"/></span>Caderno do Produtor</div><a href="#recursos" className="hidden text-sm font-semibold text-stone-600 sm:block">Conheça a solução</a></nav><section className="grid min-h-[calc(100vh-5rem)] items-center gap-12 py-12 lg:grid-cols-2"><div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-900"><Coffee className="size-4" aria-hidden="true"/>Feito para a cafeicultura</span><h1 className="mt-6 max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Sua lavoura,<br/><span className="text-emerald-800">bem acompanhada.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">Registre o manejo no campo, acompanhe a produção e trabalhe junto ao seu técnico.</p><div className="mt-8"><GoogleLogin/></div><p className="mt-4 text-xs text-stone-500">Acesso seguro e exclusivo com sua conta Google.</p></div><div id="recursos" className="relative"><div className="absolute -inset-20 -z-0 rounded-full bg-emerald-200/40 blur-3xl"/><div className="relative rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8"><p className="text-sm text-stone-500">Tudo em um só lugar</p><h2 className="mt-2 text-2xl font-bold">Do campo às decisões da safra</h2><div className="mt-6 space-y-3">{features.map(({ Icon, label, value }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-stone-100 bg-white p-4"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon aria-hidden="true"/></span><div><p className="font-bold">{label}</p><p className="text-sm text-stone-500">{value}</p></div><ArrowRight className="ml-auto size-5 text-stone-400" aria-hidden="true"/></div>)}</div></div></div></section></div></main>;
}
