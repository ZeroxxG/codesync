import React, { useState } from "react";
import { Lock, Mail, User, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-vscode-sidebar border border-vscode-border rounded shadow-2xl p-6 text-vscode-text font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-vscode-muted hover:text-vscode-text rounded hover:bg-vscode-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex border-b border-vscode-border mb-5">
          <button
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              mode === "login"
                ? "border-[#007acc] text-vscode-text"
                : "border-transparent text-vscode-muted hover:text-vscode-text"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              mode === "register"
                ? "border-[#007acc] text-vscode-text"
                : "border-transparent text-vscode-muted hover:text-vscode-text"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-vscode-muted mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-vscode-muted" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer123"
                className="w-full bg-vscode-input border border-vscode-border rounded pl-8 pr-3 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc]"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-vscode-muted mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-vscode-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@example.com"
                  className="w-full bg-vscode-input border border-vscode-border rounded pl-8 pr-3 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-vscode-muted mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-vscode-muted" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-vscode-input border border-vscode-border rounded pl-8 pr-3 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc]"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-vscode-muted mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-vscode-muted" />
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-vscode-input border border-vscode-border rounded pl-8 pr-3 py-1.5 text-xs text-vscode-text placeholder-vscode-muted focus:outline-none focus:border-[#007acc]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium py-2 px-4 rounded text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
