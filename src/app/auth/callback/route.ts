import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IdentityRepository } from "@/modules/identity/infrastructure/supabase/identity-repository";
import { acceptPendingInvitations } from "@/modules/identity/application/use-cases";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const repository = new IdentityRepository(supabase);
      await acceptPendingInvitations(repository);
      const context = await repository.getContext();
      return NextResponse.redirect(`${origin}${context?.memberships.length ? "/dashboard" : "/onboarding"}`);
    }
  }
  return NextResponse.redirect(`${origin}/?erro=autenticacao`);
}
