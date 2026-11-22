import React, { useEffect, useState } from "react";
import { LogIn, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { User } from "../../contexts/AuthContext";
import { Theme } from "../../contexts/ThemeContext";
import Brand from "./Brand";

interface NavbarProps {
  user: User | null;
  isAuthenticated: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenAuth: (mode?: "login" | "register") => void;
  onLogout: () => void;
}

const LINKS = [
  { href: "#features", label: "Capabilities" },
  { href: "#workflow", label: "Session flow" },
  { href: "#runtimes", label: "Runtimes" },
];

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isAuthenticated,
  theme,
  onToggleTheme,
  onOpenAuth,
  onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? "border-line bg-canvas/85 backdrop-blur-xl" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" aria-label="CodeSync home" className="shrink-0">
          <Brand />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="btn-icon !h-8 !w-8"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden items-center gap-1.5 md:flex">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 rounded-lg border border-line py-1 pl-2.5 pr-1">
                <span className="font-mono text-[11px] text-muted">@{user.username}</span>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth("login")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </button>
                <button
                  onClick={() => onOpenAuth("register")}
                  className="rounded-lg bg-fg px-3.5 py-1.5 text-[13px] font-semibold text-canvas transition-transform hover:opacity-90 active:scale-[0.98]"
                >
                  Open studio
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="btn-icon !h-8 !w-8 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas px-5 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/70 py-3 text-sm font-medium text-fg"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">@{user.username}</span>
                <button
                  onClick={() => {
                    onLogout();
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onOpenAuth("login");
                    setOpen(false);
                  }}
                  className="btn-quiet"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    onOpenAuth("register");
                    setOpen(false);
                  }}
                  className="btn-ink"
                >
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
