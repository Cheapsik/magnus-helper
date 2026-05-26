import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getAppUrl, isAuthPath } from "@/lib/authUrls";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => ReturnType<typeof supabase.auth.signUp>;
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signInWithGoogle: () => ReturnType<typeof supabase.auth.signInWithOAuth>;
  signOut: () => ReturnType<typeof supabase.auth.signOut>;
  resetPassword: (email: string) => ReturnType<typeof supabase.auth.resetPasswordForEmail>;
  updatePassword: (newPassword: string) => ReturnType<typeof supabase.auth.updateUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_INIT_EVENTS = new Set<AuthChangeEvent>([
  "INITIAL_SESSION",
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let authReady = false;

    const finishInitialLoad = () => {
      if (!authReady) {
        authReady = true;
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (AUTH_INIT_EVENTS.has(event)) {
        finishInitialLoad();
      }

      if (event === "SIGNED_IN" && nextSession?.user) {
        if (isAuthPath(window.location.pathname)) {
          navigate("/", { replace: true });
        }
      }

      if (event === "SIGNED_OUT") {
        if (!isAuthPath(window.location.pathname)) {
          navigate("/auth", { replace: true });
        }
      }
    });

    void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      finishInitialLoad();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signUp = useCallback((email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  }, []);

  const signIn = useCallback((email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signInWithGoogle = useCallback(() => {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAppUrl() },
    });
  }, []);

  const signOut = useCallback(() => {
    return supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback((email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAppUrl("reset-password"),
    });
  }, []);

  const updatePassword = useCallback((newPassword: string) => {
    return supabase.auth.updateUser({ password: newPassword });
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
