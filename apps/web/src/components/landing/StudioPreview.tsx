import React from "react";
import { CircleDot, GitBranch, Play, Terminal } from "lucide-react";

interface StudioPreviewProps {
  className?: string;
  /** hide the floating side cards on small screens */
  compact?: boolean;
}

const CURSOR_USERS = [
  { initials: "AL", name: "Ada", color: "#cbf24b", text: "#14180a" },
  { initials: "MK", name: "Maya", color: "#7dd3fc", text: "#0b1215" },
  { initials: "SR", name: "Sam", color: "#fca5a5", text: "#1a0d0d" },
];

const Line: React.FC<{ n: number; children: React.ReactNode; active?: boolean }> = ({
  n,
  children,
  active,
}) => (
  <div
    className={`flex gap-4 rounded-r px-3 ${
      active ? "-ml-3 border-l-2 border-[#cbf24b] bg-[#cbf24b]/[0.07] pl-[10px]" : ""
    }`}
  >
    <span className="w-5 shrink-0 select-none text-right text-[#4b5563]">{n}</span>
    <span className="whitespace-pre">{children}</span>
  </div>
);

export const StudioPreview: React.FC<StudioPreviewProps> = ({ className = "", compact }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Editor window */}
      <div className="overflow-hidden rounded-xl border border-[#2a2f36] bg-[#0d0f12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)]">
        {/* Tab strip */}
        <div className="flex items-center gap-0 border-b border-[#22262c] bg-[#12151a]">
          <div className="flex items-center gap-2 border-r border-[#22262c] bg-[#0d0f12] px-4 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f0a3a3]" />
            <span className="font-mono text-[11px] text-[#d7dadf]">merge_intervals.py</span>
            <span className="font-mono text-[10px] text-[#5b6169]">●</span>
          </div>
          <span className="px-4 py-2.5 font-mono text-[11px] text-[#5b6169]">scratch.js</span>
          <div className="ml-auto flex items-center gap-2 px-3.5">
            <GitBranch className="h-3 w-3 text-[#5b6169]" />
            <span className="font-mono text-[10px] text-[#5b6169]">main</span>
          </div>
        </div>

        {/* Breadcrumb + presence */}
        <div className="flex items-center justify-between border-b border-[#1b1f24] px-4 py-2">
          <span className="font-mono text-[10px] tracking-wide text-[#5b6169]">
            rooms / pair-session / algorithms
          </span>
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-1.5">
              {CURSOR_USERS.map((u) => (
                <span
                  key={u.initials}
                  title={u.name}
                  style={{ backgroundColor: u.color, color: u.text }}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-[#12151a]"
                >
                  {u.initials}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-[#2b3a1e] bg-[#cbf24b]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#cbf24b]">
              <CircleDot className="h-2.5 w-2.5" /> live
            </span>
          </div>
        </div>

        {/* Code */}
        <div className="overflow-x-auto py-3 font-mono text-[11.5px] leading-[1.75] text-[#c9ced6] sm:text-[12.5px]">
          <Line n={1}>
            <span className="text-[#8b93a1]"># merge overlapping intervals</span>
          </Line>
          <Line n={2}>
            <span className="text-[#cbf24b]">def</span>{" "}
            <span className="text-[#8fd0ff]">merge</span>(intervals:{" "}
            <span className="text-[#e8c07d]">list</span>):
          </Line>
          <Line n={3}>
            {"    "}intervals.<span className="text-[#8fd0ff]">sort</span>(key=
            <span className="text-[#cbf24b]">lambda</span> i: i[<span className="text-[#f0a3a3]">0</span>])
          </Line>
          <Line n={4}>
            {"    "}out = [intervals[<span className="text-[#f0a3a3]">0</span>]]
          </Line>
          <Line n={5} active>
            {"    "}
            <span className="text-[#cbf24b]">for</span> start, end{" "}
            <span className="text-[#cbf24b]">in</span> intervals[<span className="text-[#f0a3a3]">1</span>:]:
            <span
              className="ml-1.5 inline-block rounded px-1 align-middle font-sans text-[9px] font-bold"
              style={{ backgroundColor: "#cbf24b", color: "#14180a" }}
            >
              Ada
            </span>
          </Line>
          <Line n={6}>
            {"        "}
            <span className="text-[#cbf24b]">if</span> start &lt;= out[-1][1]:
          </Line>
          <Line n={7}>
            {"            "}out[-1][1] ={" "}
            <span className="text-[#8fd0ff]">max</span>(out[-1][1], end)
            <span className="ml-0.5 inline-block h-[13px] w-[2px] animate-blink bg-[#7dd3fc] align-middle" />
            <span
              className="ml-1 inline-block rounded px-1 align-middle font-sans text-[9px] font-bold"
              style={{ backgroundColor: "#7dd3fc", color: "#08131a" }}
            >
              Maya
            </span>
          </Line>
          <Line n={8}>
            {"        "}
            <span className="text-[#cbf24b]">else</span>:
          </Line>
          <Line n={9}>
            {"            "}out.<span className="text-[#8fd0ff]">append</span>([start, end])
          </Line>
          <Line n={10}>
            {"    "}
            <span className="text-[#cbf24b]">return</span> out
          </Line>
        </div>

        {/* Output strip */}
        <div className="border-t border-[#22262c] bg-[#12151a]">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b93a1]">
              <Terminal className="h-3 w-3 text-[#cbf24b]" /> sandbox
            </span>
            <span className="inline-flex items-center gap-2 font-mono text-[10px]">
              <span className="text-[#cbf24b]">exit 0</span>
              <span className="text-[#5b6169]">·</span>
              <span className="text-[#8b93a1]">42ms</span>
              <span className="inline-flex items-center gap-1 rounded bg-[#cbf24b] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#14180a]">
                <Play className="h-2.5 w-2.5 fill-current" /> run
              </span>
            </span>
          </div>
          <div className="border-t border-[#1b1f24] px-4 py-2.5 font-mono text-[11px] text-[#a9e88a]">
            [[1, 6], [8, 10], [15, 18]]
          </div>
        </div>
      </div>

      {/* Floating presence card */}
      {!compact && (
        <div className="absolute -left-4 bottom-12 hidden animate-drift rounded-lg border border-line bg-surface p-2.5 shadow-xl sm:block lg:-left-8">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {CURSOR_USERS.map((u) => (
                <span
                  key={u.initials}
                  style={{ backgroundColor: u.color, color: u.text }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-surface"
                >
                  {u.initials}
                </span>
              ))}
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-fg">3 editing</p>
              <p className="font-mono text-[9px] text-muted">same buffer</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating latency card */}
      {!compact && (
        <div className="absolute -right-3 top-14 hidden rounded-lg border border-line bg-surface px-3 py-2 shadow-xl sm:block lg:-right-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">sync</p>
          <p className="font-display text-lg font-bold leading-none text-fg">
            18<span className="text-[10px] text-muted">ms</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default StudioPreview;
