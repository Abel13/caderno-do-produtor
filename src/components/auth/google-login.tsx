"use client";

import { useState } from "react";
import { LogIn, Loader } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleLogin() {
  const [loading, setLoading] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } }
    });
    setLoading(false);
  }

  return (
    <Button size="lg" onClick={signIn} disabled={!configured || loading} className="w-full sm:w-auto">
      {loading ? <Loader className="size-5 animate-spin" aria-hidden="true" /> : <LogIn className="size-5" aria-hidden="true" />}
      Entrar com Google
    </Button>
  );
}
