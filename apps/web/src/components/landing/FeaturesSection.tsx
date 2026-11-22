import React from "react";
import {
  Code2,
  History,
  Lock,
  MousePointer2,
  PlayCircle,
  Radio,
  Users,
  Zap,
} from "lucide-react";
import Reveal from "./Reveal";

const TICKER = [
  "Yjs CRDT",
  "Hocuspocus",
  "Monaco Editor",
  "Awareness protocol",
  "Docker sandboxes",
  "PostgreSQL snapshots",
  "Role-based tokens",
  "WebSocket auth",
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="border-t border-line">
      {/* Ticker */}
      <div className="overflow-hidden border-b border-line py-3">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={copy === 1}>
              {TICKER.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
                >
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">Capabilities</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tightest text-fg sm:text-[2.6rem] sm:leading-[1.05]">
              A shared buffer that behaves like a real IDE
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Every layer is built for simultaneous editing — from the CRDT document
              underneath to the cursors you actually see.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature: Sync — hero tile */}
          <Reveal className="md:col-span-2 lg:col-span-2">
            <article className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-sm">
                  <div className="icon-tile h-10 w-10">
                    <Zap className="h-5 w-5 text-accentText" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-fg">
                    Conflict-free by construction
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Yjs CRDTs merge concurrent keystrokes deterministically over
                    Hocuspocus WebSockets, so two people can type in the same line
                    without clobbering each other.
                  </p>
                </div>
                <Radio className="hidden h-5 w-5 shrink-0 text-accentText/70 sm:block" />
              </div>

              {/* Mini merge diagram */}
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-line bg-canvas p-3">
                <div className="space-y-1.5">
                  <span className="block h-1.5 w-full rounded-full bg-[#7dd3fc]/60" />
                  <span className="block h-1.5 w-2/3 rounded-full bg-[#7dd3fc]/30" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  merge
                </span>
                <div className="space-y-1.5">
                  <span className="block h-1.5 w-full rounded-full bg-accent/70" />
                  <span className="block h-1.5 w-1/2 rounded-full bg-accent/30" />
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal delay={60}>
            <article className="group h-full rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40">
              <div className="icon-tile h-10 w-10">
                <MousePointer2 className="h-5 w-5 text-fg" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-fg">
                Presence you can feel
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Named cursors, colored selections, and per-user awareness states. See
                exactly who is reading and where.
              </p>
            </article>
          </Reveal>

          <Reveal delay={80}>
            <article className="group h-full rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40">
              <div className="icon-tile h-10 w-10">
                <Code2 className="h-5 w-5 text-fg" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-fg">
                Monaco, not a textarea
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The VS Code editing engine: IntelliSense-ready syntax, multi-cursor,
                find &amp; replace, and full keyboard control.
              </p>
            </article>
          </Reveal>

          <Reveal delay={100}>
            <article className="group h-full rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40">
              <div className="icon-tile h-10 w-10">
                <PlayCircle className="h-5 w-5 text-accentText" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-fg">
                Run it in a sandbox
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Execute in isolated containers with streamed stdout, exit codes, duration,
                and hard time/memory limits.
              </p>
            </article>
          </Reveal>

          <Reveal delay={120}>
            <article className="group h-full rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40">
              <div className="icon-tile h-10 w-10">
                <Lock className="h-5 w-5 text-fg" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-fg">
                Roles, not guesswork
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Owner, editor, and viewer tokens are enforced on the HTTP API and the
                WebSocket handshake alike.
              </p>
            </article>
          </Reveal>

          <Reveal delay={140} className="md:col-span-2">
            <article className="group flex h-full flex-col justify-between gap-5 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40 sm:flex-row sm:items-center">
              <div className="max-w-md">
                <div className="icon-tile h-10 w-10">
                  <History className="h-5 w-5 text-fg" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-fg">
                  Snapshots &amp; run history
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Documents persist to PostgreSQL and every execution is replayable, so
                  you can review what broke and when.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:self-auto">
                <Users className="h-3.5 w-3.5 text-accentText" />
                persisted
                <span className="h-1 w-1 rounded-full bg-line" />
                replayable
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
