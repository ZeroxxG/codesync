import React from "react";
import { ArrowUp, Plus } from "lucide-react";
import Brand from "./Brand";
import Reveal from "./Reveal";

interface FooterProps {
  onCreateRoom: () => void;
  loading: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onCreateRoom, loading }) => {
  return (
    <>
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-fg px-6 py-12 text-canvas sm:px-12 sm:py-16">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-2xl"
              />
              <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
                <div className="max-w-xl">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">
                    ready when you are
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tightest sm:text-[2.75rem]">
                    Start a room and
                    <br className="hidden sm:block" /> invite someone in.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed opacity-70">
                    No installs, no local toolchain. Just a link, a cursor, and a shared
                    buffer.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    onClick={onCreateRoom}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-[#14180a] transition-transform hover:brightness-105 active:scale-[0.985] disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {loading ? "Creating…" : "Create room"}
                  </button>
                  <a
                    href="#launcher"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-canvas/25 px-5 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-canvas/10"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Join existing
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <Brand size="sm" />
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              realtime collaborative editor
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
            <a href="#features" className="transition-colors hover:text-fg">
              Capabilities
            </a>
            <a href="#workflow" className="transition-colors hover:text-fg">
              Session flow
            </a>
            <a href="#runtimes" className="transition-colors hover:text-fg">
              Runtimes
            </a>
            <a href="#launcher" className="transition-colors hover:text-fg">
              Launch
            </a>
          </nav>

          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            © {new Date().getFullYear()} CodeSync
          </p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
