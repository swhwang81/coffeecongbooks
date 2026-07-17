"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!browserSupabase) return;

      const {
        data: { session: s },
      } = await browserSupabase.auth.getSession();

      if (!mounted) return;
      setSession(s ?? null);

      const { data } = browserSupabase.auth.onAuthStateChange((_event, session) => {
        setSession(session ?? null);
      });

      return () => {
        mounted = false;
        data.subscription.unsubscribe();
      };
    }

    init();
  }, []);

  return session;
}

export async function signInWithEmail(email: string, password: string) {
  if (!browserSupabase) return { error: new Error("Supabase not configured") };
  const res = await browserSupabase.auth.signInWithPassword({ email, password });
  return res;
}

export async function signOut() {
  if (!browserSupabase) return;
  await browserSupabase.auth.signOut();
}
