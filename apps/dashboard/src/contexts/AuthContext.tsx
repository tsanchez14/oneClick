import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@onclick/utils";
import type { User } from "@onclick/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthState {
  user: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isProfessional: () => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });
  const userIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    setState((prev) => ({
      ...prev,
      profile: data ?? null,
      loading: false,
    }));
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setState((prev) => ({ ...prev, loading: true }));
    await fetchProfile(uid);
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        setState({ user: session.user, profile: null, loading: true });
        fetchProfile(session.user.id);
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        setState({ user: session.user, profile: null, loading: true });
        fetchProfile(session.user.id);
      } else {
        userIdRef.current = null;
        setState({ user: null, profile: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function isAdmin() {
    return state.profile?.role === "admin";
  }

  function isProfessional() {
    return state.profile?.role === "professional";
  }

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, isAdmin, isProfessional, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
