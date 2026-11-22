import React, { useEffect, useState } from "react";
import { Lock, Mail, User, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Brand from "./landing/Brand";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
}

const fieldLabel = "mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted";

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "login",
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, email, password, passwordConfirm);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="modal-shell max-w-[26rem]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-7">
          <Brand size="sm" />
          <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tightest text-fg">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {mode === "login"
              ? "Sign in to own rooms, keep snapshots, and manage collaborators."
              : "Claim your rooms, control access, and keep your run history."}
          </p>
        </div>

        <div className="px-6 sm:px-7">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-lg py-2 text-[12.5px] font-semibold transition-colors ${
                  mode === m
                    ? "bg-fg text-canvas"
                    : "text-muted hover:text-fg"
                }`}
              >
                {m === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-7 sm:px-7">
          <div>
            <label className={fieldLabel}>Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer123"
                className="field pl-9"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className={fieldLabel}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@example.com"
                  className="field pl-9"
                />
              </div>
            </div>
          )}

          <div>
            <label className={fieldLabel}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field pl-9"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className={fieldLabel}>Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted" />
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="field pl-9"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-signal mt-1 w-full">
            {loading ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
