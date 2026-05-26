import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Dice5,
  Eye,
  EyeOff,
  Lock,
  Mail,
  NotebookPen,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isRecoveryAuthCallback } from "@/lib/authUrls";
import { cn } from "@/lib/utils";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/images/background.png`;
const AUTH_FAVICON = `${import.meta.env.BASE_URL}favicon.png`;

type AuthView = "login" | "register" | "forgot" | "new-password";

const FEATURES = [
  { icon: BookOpen, title: "Sesje RPG", subtitle: "zarządzane bez wysiłku" },
  { icon: NotebookPen, title: "Panel mistrza gry", subtitle: "notatki, wątki, muzyka" },
  { icon: Users, title: "Bohaterowie i NPC", subtitle: "pełna kontrola nad światem" },
  { icon: Dice5, title: "Inteligentne rzuty", subtitle: "bez przerywania gry" },
] as const;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppLogo({ className }: { className?: string }) {
  return (
    <img
      src={AUTH_FAVICON}
      alt=""
      width={64}
      height={64}
      decoding="async"
      className={cn("h-12 w-12 object-contain sm:h-16 sm:w-16", className)}
    />
  );
}

function AuthField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  showToggle,
  showPassword,
  onTogglePassword,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: typeof Mail;
  autoComplete?: string;
  showToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  minLength?: number;
}) {
  return (
    <div className="space-y-1 sm:space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-white/90 sm:text-sm">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          minLength={minLength}
          className={cn(
            "h-9 w-full rounded-md border border-white/15 bg-black/45 py-2 text-sm text-white sm:h-11 sm:rounded-lg",
            "placeholder:text-white/35 focus:border-[#c5a059]/60 focus:outline-none focus:ring-1 focus:ring-[#c5a059]/40",
            showToggle ? "pl-10 pr-10" : "pl-10 pr-3",
          )}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page relative flex min-h-screen flex-col text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${AUTH_BG})` }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 bg-black/55" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-4 sm:px-4 sm:py-10">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(85vh,520px)] w-[min(100%,100%)] -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] bg-black/45 blur-2xl sm:h-[min(90vh,640px)] sm:w-[min(100%,560px)] sm:rounded-[2rem] sm:blur-3xl"
          aria-hidden
        />
        {children}
      </div>

      <footer className="relative z-10 shrink-0 px-3 pb-3 sm:px-4 sm:pb-6">
        <div className="mx-auto hidden max-w-5xl rounded-xl border border-white/10 bg-black/50 px-8 py-4 backdrop-blur-md sm:block">
          <div className="grid grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, subtitle }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#c5a059]/30 bg-[#c5a059]/10">
                  <Icon className="h-5 w-5 text-[#c5a059]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight text-white">{title}</p>
                  <p className="text-xs text-white/50">{subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-[10px] text-white/40 sm:mt-4 sm:text-xs">
          © 2026 Magnus Helper. Wszystkie prawa zastrzeżone.
        </p>
      </footer>
    </div>
  );
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative z-10 w-full max-w-[520px] rounded-xl border border-white/10 px-5 py-5 shadow-2xl sm:rounded-2xl sm:px-10 sm:py-9",
        "bg-[rgba(22,22,26,0.88)] backdrop-blur-md",
      )}
    >
      {children}
    </div>
  );
}

function AuthHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-4 flex flex-col items-center text-center sm:mb-6">
      <AppLogo className="mb-2 sm:mb-3" />
      <h1 className="font-app-brand text-2xl font-normal tracking-wide text-white sm:text-3xl">Magnus Helper</h1>
      <p className="mt-0.5 text-xs text-[#c5a059] sm:mt-1 sm:text-sm">
        {subtitle ?? "— Twoje wsparcie w każdej sesji RPG —"}
      </p>
    </div>
  );
}

function GoldButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-1 rounded-md text-sm font-semibold text-white transition-colors sm:h-11 sm:rounded-lg",
        "bg-[#c5a059] hover:bg-[#b8924f] disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function AuthDivider() {
  return (
    <div className="relative my-3 sm:my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/15" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-[rgba(22,22,26,0.88)] px-3 text-white/40">LUB</span>
      </div>
    </div>
  );
}

function GoogleButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/15 sm:h-11 sm:gap-3 sm:rounded-lg",
        "bg-black/45 text-sm font-medium text-white transition-colors hover:bg-black/60",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

function AuthAlert({ error, success }: { error: string | null; success: string | null }) {
  if (!error && !success) return null;
  return (
    <div className="mb-3 space-y-2 sm:mb-4">
      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-950/50 px-2.5 py-1.5 text-xs text-red-200 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-[#c5a059]/40 bg-[#c5a059]/10 px-2.5 py-1.5 text-xs text-[#e8d4a8] sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm">
          {success}
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signUp, signIn, signInWithGoogle, resetPassword, updatePassword } = useAuth();

  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isRecoveryAuthCallback()) {
      setView("new-password");
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    if (view === "new-password" || isRecoveryAuthCallback()) return;
    navigate("/", { replace: true });
  }, [loading, user, view, navigate]);

  const resetFormMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const switchView = (next: AuthView) => {
    resetFormMessages();
    setView(next);
  };

  const handleGoogle = async () => {
    resetFormMessages();
    setSubmitting(true);
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) setError(oauthError.message);
    setSubmitting(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    resetFormMessages();
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
    } else {
      navigate("/", { replace: true });
    }
    setSubmitting(false);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    resetFormMessages();

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hasła muszą być identyczne.");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp(email, password);
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess("Sprawdź skrzynkę email i potwierdź rejestrację");
    }
    setSubmitting(false);
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    resetFormMessages();
    setSubmitting(true);
    const { error: resetError } = await resetPassword(email);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess("Jeśli konto istnieje, wysłaliśmy email z instrukcjami");
    }
    setSubmitting(false);
  };

  const handleNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    resetFormMessages();

    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hasła muszą być identyczne.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      setError(updateError.message);
    } else {
      navigate("/", { replace: true });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <AuthShell>
        <AuthCard>
          <div className="flex flex-col items-center py-8 sm:py-12">
            <AppLogo className="mb-4 animate-pulse" />
            <p className="text-sm text-white/50">Ładowanie…</p>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  const viewSubtitles: Record<AuthView, string | undefined> = {
    login: undefined,
    register: "— Utwórz konto —",
    forgot: "— Odzyskaj dostęp —",
    "new-password": "— Ustaw nowe hasło —",
  };

  return (
    <AuthShell>
      <AuthCard>
        <AuthHeader subtitle={viewSubtitles[view]} />
        <AuthAlert error={error} success={success} />

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            <AuthField
              id="login-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Wpisz swój email"
              icon={Mail}
              autoComplete="email"
            />
            <AuthField
              id="login-password"
              label="Hasło"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="Wpisz swoje hasło"
              icon={Lock}
              autoComplete="current-password"
              showToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
            />
            <GoldButton disabled={submitting}>
              Zaloguj się <span aria-hidden>&gt;</span>
            </GoldButton>
            <AuthDivider />
            <GoogleButton onClick={() => void handleGoogle()} disabled={submitting} label="Zaloguj przez Google" />
            <div className="mt-3 space-y-1.5 text-center text-xs sm:mt-5 sm:space-y-2 sm:text-sm">
              <p className="text-white/70">
                Nie masz konta?{" "}
                <button
                  type="button"
                  className="font-medium text-[#c5a059] hover:underline"
                  onClick={() => switchView("register")}
                >
                  Zarejestruj się
                </button>
              </p>
              <button
                type="button"
                className="text-white/45 hover:text-white/70 hover:underline"
                onClick={() => switchView("forgot")}
              >
                Zapomniałem hasła
              </button>
            </div>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
            <AuthField
              id="register-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Wpisz swój email"
              icon={Mail}
              autoComplete="email"
            />
            <AuthField
              id="register-password"
              label="Hasło"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="Minimum 8 znaków"
              icon={Lock}
              autoComplete="new-password"
              showToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              minLength={8}
            />
            <AuthField
              id="register-confirm"
              label="Potwierdź hasło"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Powtórz hasło"
              icon={Lock}
              autoComplete="new-password"
              showToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword((v) => !v)}
              minLength={8}
            />
            <GoldButton disabled={submitting}>
              Zarejestruj się <span aria-hidden>&gt;</span>
            </GoldButton>
            <AuthDivider />
            <GoogleButton
              onClick={() => void handleGoogle()}
              disabled={submitting}
              label="Zarejestruj przez Google"
            />
            <p className="mt-3 text-center text-xs text-white/70 sm:mt-5 sm:text-sm">
              Masz już konto?{" "}
              <button
                type="button"
                className="font-medium text-[#c5a059] hover:underline"
                onClick={() => switchView("login")}
              >
                Zaloguj się
              </button>
            </p>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3 sm:space-y-4">
            <AuthField
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Wpisz swój email"
              icon={Mail}
              autoComplete="email"
            />
            <GoldButton disabled={submitting}>
              Wyślij link resetujący <span aria-hidden>&gt;</span>
            </GoldButton>
            <p className="mt-3 text-center text-xs sm:mt-5 sm:text-sm">
              <button
                type="button"
                className="text-[#c5a059] hover:underline"
                onClick={() => switchView("login")}
              >
                Wróć do logowania
              </button>
            </p>
          </form>
        )}

        {view === "new-password" && (
          <form onSubmit={handleNewPassword} className="space-y-3 sm:space-y-4">
            <AuthField
              id="new-password"
              label="Nowe hasło"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="Minimum 8 znaków"
              icon={Lock}
              autoComplete="new-password"
              showToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              minLength={8}
            />
            <AuthField
              id="new-password-confirm"
              label="Potwierdź nowe hasło"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Powtórz hasło"
              icon={Lock}
              autoComplete="new-password"
              showToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword((v) => !v)}
              minLength={8}
            />
            <GoldButton disabled={submitting}>
              Ustaw nowe hasło <span aria-hidden>&gt;</span>
            </GoldButton>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  );
}
