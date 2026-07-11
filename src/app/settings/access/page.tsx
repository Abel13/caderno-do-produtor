import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Coffee, UserCheck, Users, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { chooseActiveProperty, canManageAccount } from "@/modules/identity/domain/permissions";
import type { AccountInvitation, AccountMember, IdentityProperty } from "@/modules/identity/domain/types";
import { requireIdentityContext } from "@/modules/identity/infrastructure/supabase/server-context";
import { InvitationForm } from "@/modules/identity/presentation/components/invitation-form";
import { revokeInvitationAction, revokeMembershipAction, updateInvitationAction } from "@/modules/identity/presentation/actions";

export default async function AccessSettingsPage() {
  const { repository, context } = await requireIdentityContext();
  const activeProperty = chooseActiveProperty(context.properties, context.profile.last_property_id);
  if (!activeProperty) redirect("/dashboard");
  const membership = context.memberships.find((item) => item.account_id === activeProperty.account_id);
  if (!membership || !canManageAccount(membership.role)) redirect("/dashboard");
  const [members, invitations] = await Promise.all([repository.listMembers(membership.account_id), repository.listInvitations(membership.account_id)]);
  const accountProperties = context.properties.filter((property) => property.account_id === membership.account_id);

  return <main className="min-h-screen bg-[#f7f6f1] px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ArrowRight className="size-4 rotate-180" aria-hidden="true"/>Voltar ao dashboard</Link><div className="mt-6 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-800 text-white"><Coffee aria-hidden="true"/></span><div><h1 className="text-3xl font-bold">Acessos da conta</h1><p className="text-stone-500">{membership.account_name}</p></div></div><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"><section className="space-y-6"><Panel title="Pessoas com acesso" Icon={Users}>{members.length ? <div className="divide-y divide-stone-100">{members.map((member) => <MemberRow key={member.id} member={member}/>)}</div> : <Empty text="Nenhum colaborador vinculado."/>}</Panel><Panel title="Convites pendentes" Icon={UserCheck}>{invitations.length ? <div className="divide-y divide-stone-100">{invitations.map((invitation) => <InvitationRow key={invitation.id} invitation={invitation} properties={accountProperties}/>)}</div> : <Empty text="Nenhum convite aguardando acesso."/>}</Panel></section><aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Novo acesso</h2><p className="mt-1 text-sm text-stone-500">Crie um vínculo pendente pelo e-mail Google.</p><div className="mt-5"><InvitationForm accountId={membership.account_id} properties={accountProperties}/></div></aside></div></div></main>;
}

function MemberRow({ member }: { member: AccountMember }) {
  return <div className="flex items-center gap-3 py-4"><span className="grid size-10 place-items-center rounded-full bg-stone-100"><UserCheck className="size-5" aria-hidden="true"/></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.profile?.full_name ?? "Usuário Google"}</p><p className="text-sm capitalize text-stone-500">{member.role}</p></div>{member.role !== "owner" && <form action={revokeMembershipAction}><input type="hidden" name="membershipId" value={member.id}/><Button variant="ghost" size="sm" aria-label={`Revogar acesso de ${member.profile?.full_name ?? "usuário"}`}><X className="size-4" aria-hidden="true"/>Revogar</Button></form>}</div>;
}

function InvitationRow({ invitation, properties }: { invitation: AccountInvitation; properties: IdentityProperty[] }) {
  return <div className="py-4"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="truncate font-semibold">{invitation.email}</p><p className="text-sm text-stone-500">{invitation.role === "manager" ? "Gestor · todas as propriedades" : `Técnico · ${invitation.property_ids.length} propriedade(s)`}</p></div><form action={revokeInvitationAction}><input type="hidden" name="invitationId" value={invitation.id}/><Button variant="ghost" size="sm">Revogar</Button></form></div><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-emerald-800">Corrigir convite</summary><form action={updateInvitationAction} className="mt-3 space-y-3 rounded-xl bg-stone-50 p-3"><input type="hidden" name="invitationId" value={invitation.id}/><input type="hidden" name="accountId" value={invitation.account_id}/><label className="block text-xs font-semibold">E-mail<input name="email" type="email" defaultValue={invitation.email} className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3" required/></label><label className="block text-xs font-semibold">Papel<select name="role" defaultValue={invitation.role} className="mt-1 h-10 w-full rounded-lg border border-stone-300 bg-white px-3"><option value="technician">Técnico</option><option value="manager">Gestor</option></select></label><fieldset><legend className="text-xs font-semibold">Propriedades do técnico</legend>{properties.map((property) => <label key={property.id} className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" name="propertyIds" value={property.id} defaultChecked={invitation.property_ids.includes(property.id)}/>{property.name}</label>)}</fieldset><Button size="sm" type="submit">Salvar correção</Button></form></details></div>;
}

function Panel({ title, Icon, children }: { title: string; Icon: typeof Users; children: React.ReactNode }) { return <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Icon className="size-5 text-emerald-700" aria-hidden="true"/><h2 className="text-lg font-bold">{title}</h2></div><div className="mt-3">{children}</div></section>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-stone-500">{text}</p>; }
