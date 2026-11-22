import React from "react";
import { ArrowRight, Plus, Zap } from "lucide-react";
import Reveal from "./Reveal";
import StudioPreview from "./StudioPreview";

interface HeroSectionProps {
  activeDisplayName: string;
  isAuthenticated: boolean;
  onUserNameChange: (value: string) => void;
  roomSlug: string;
  onRoomSlugChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  recentRooms: string[];
  onCreateRoom: () => void;
  onJoinExisting: (e: React.FormEvent) => void;
  onJoinRecent: (slug: string) => void;
}

const STATS = [
  { value: "CRDT", label: "Yjs conflict-free sync" },
  { value: "3", label: "sandboxed runtimes" },
  { value: "0", label: "setup steps" },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  activeDisplayName,
  isAuthenticated,
  onUserNameChange,
  roomSlug,
  onRoomSlugChange,
  loading,
  error,
  recentRooms,
  onCreateRoom,
  onJoinExisting,
  onJoinRecent,
}) => {
  return (
    <section id="top" className="relative">
      <div className="blueprint pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60" />

      <div className="relative mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          {/* Copy + launcher */}
          <div>
            <Reveal>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#14180a]">
                  <Zap className="h-2.5 w-2.5" /> live
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  multiplayer editor &amp; sandbox
                </span>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.98] tracking-tightest text-fg sm:text-6xl lg:text-[4.15rem]">
                Write code
                <br />
                together,{" "}
                <span className="underline-signal">
                  live<span className="text-accentText">.</span>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-muted sm:text-base">
                CodeSync is a shared buffer for people who ship. Real cursors, real
                presence, real execution — in a single room you can open in one click.
              </p>
            </Reveal>

            {/* Launcher */}
            <Reveal delay={180}>
              <div
                id="launcher"
                className="mt-8 rounded-2xl border border-line bg-surface p-4 sm:p-5"
              >
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <label className="flex-1">
                    <span className="eyebrow mb-1.5 block">Display name</span>
                    <input
                      type="text"
                      value={activeDisplayName}
                      disabled={isAuthenticated}
                      onChange={(e) => onUserNameChange(e.target.value)}
                      placeholder="Enter your name"
                      className="field font-mono text-[13px]"
                    />
                  </label>
                  <div className="flex-1 sm:mt-[22px]">
                    <button
                      onClick={onCreateRoom}
                      disabled={loading}
                      className="btn-signal h-[42px] w-full"
                    >
                      <Plus className="h-4 w-4" />
                      {loading ? "Creating…" : "Create room"}
                    </button>
                  </div>
                </div>

                <div className="my-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    or join with a link
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <form onSubmit={onJoinExisting} className="flex gap-2">
                  <input
                    type="text"
                    value={roomSlug}
                    onChange={(e) => onRoomSlugChange(e.target.value)}
                    placeholder="room slug or invite link"
                    className="field flex-1 font-mono text-[13px]"
                  />
                  <button
                    type="submit"
                    disabled={!roomSlug.trim()}
                    aria-label="Join room"
                    className="btn-ink !px-3.5"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                {recentRooms.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                    <span className="eyebrow mr-1">recent</span>
                    {recentRooms.map((slug) => (
                      <button
                        key={slug}
                        onClick={() => onJoinRecent(slug)}
                        className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-accent/50 hover:text-fg"
                      >
                        #{slug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal delay={240}>
              <dl className="mt-8 grid grid-cols-3 divide-x divide-line">
                {STATS.map((stat) => (
                  <div key={stat.label} className="px-3 first:pl-0">
                    <dt className="font-display text-xl font-bold text-fg">{stat.value}</dt>
                    <dd className="mt-0.5 text-[11px] leading-snug text-muted">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* Preview */}
          <Reveal delay={140} className="lg:pt-6">
            <div className="relative">
              <div className="absolute -inset-x-6 -top-6 bottom-6 -z-10 rounded-[2rem] bg-raised/60" />
              <StudioPreview />
              <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                one room · three cursors · zero merge conflicts
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
