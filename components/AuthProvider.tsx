"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { CurrentUser } from "@/lib/auth";
import { useStore } from "@/lib/store";

interface AuthState {
  user: CurrentUser | null;
  session: Session | null;
  ready: boolean;
}

const Ctx = createContext<AuthState>({
  user: null,
  session: null,
  ready: false,
});

function toCurrentUser(u: User): CurrentUser {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    u.email?.split("@")[0] ||
    "User";
  const avatarUrl =
    (meta.avatar_url as string) || (meta.picture as string) || undefined;
  return {
    id: u.id,
    email: u.email ?? "",
    name,
    avatarUrl,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    ready: false,
  });
  const setStoreUser = useStore((s) => s.setCurrentUser);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setState({ user: null, session: null, ready: true });
      setStoreUser(null);
      return;
    }

    void sb.auth.getSession().then(({ data }) => {
      const user = data.session ? toCurrentUser(data.session.user) : null;
      setState({ user, session: data.session, ready: true });
      setStoreUser(user);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      const user = session ? toCurrentUser(session.user) : null;
      setState({ user, session, ready: true });
      setStoreUser(user);
    });

    return () => subscription.unsubscribe();
  }, [setStoreUser]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function useUser() {
  return useContext(Ctx).user;
}
