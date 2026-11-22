import React from "react";
import { ArrowUpRight, Braces, FileCode2, Rocket, Share2 } from "lucide-react";
import Reveal from "./Reveal";

const STEPS = [
  {
    n: "01",
    icon: Rocket,
    title: "Open a room",
    body: "Name yourself and hit create. CodeSync provisions the document, the WebSocket room, and your editor in one pass.",
    detail: "POST /api/rooms/",
  },
  {
    n: "02",
    icon: Share2,
    title: "Share with intent",
    body: "Send an edit link to collaborate, or a viewer link for demos and interviews. Tokens are scoped and revocable.",
    detail: "editor_token · viewer_token",
  },
  {
    n: "03",
    icon: FileCode2,
    title: "Write in lockstep",
    body: "Type in Monaco while everyone else's cursor moves in real time. Language changes sync through the shared document.",
    detail: "Yjs · MonacoBinding",
  },
  {
    n: "04",
    icon: Braces,
    title: "Run and review",
    body: "Execute in a sandbox, read streamed output, ask for an explanation, then revisit the run from history.",
    detail: "isolation · history",
  },
];

const RUNTIMES = [
  {
    id: "python",
    name: "Python",
    version: "3.x",
    body: "Algorithms, scripting, interviews. The default room language.",
    tint: "text-[#7dd3fc]",
    bar: "bg-[#7dd3fc]",
  },
  {
    id: "javascript",
    name: "JavaScript",
    version: "Node.js",
    body: "Async logic, utilities, and quick prototypes in a fast V8 sandbox.",
    tint: "text-[#e8c07d]",
    bar: "bg-[#e8c07d]",
  },
  {
    id: "cpp",
    name: "C++",
    version: "GCC",
    body: "Compiled execution for systems work and competitive programming.",
    tint: "text-[#cbf24b]",
    bar: "bg-[#cbf24b]",
  },
];

export const WorkflowSection: React.FC = () => {
  return (
    <>
      <section id="workflow" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="eyebrow">Session flow</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tightest text-fg sm:text-[2.6rem] sm:leading-[1.05]">
                  Four moves from blank to running
                </h2>
              </div>
              <a
                href="#launcher"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-fg"
              >
                start now <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </Reveal>

          <div role="list" className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.n} delay={i * 70} as="div" role="listitem">
                  <div className="group h-full bg-surface p-6 transition-colors hover:bg-raised">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-muted">
                        {step.n}
                      </span>
                      <Icon className="h-4 w-4 text-muted transition-colors group-hover:text-accentText" />
                    </div>
                    <h3 className="mt-8 font-display text-base font-bold text-fg">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{step.body}</p>
                    <p className="mt-5 border-t border-line pt-3 font-mono text-[10px] text-muted/80">
                      {step.detail}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="runtimes" className="border-t border-line">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <Reveal>
              <div>
                <p className="eyebrow">Runtimes</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tightest text-fg sm:text-[2.6rem] sm:leading-[1.05]">
                  Three languages, one sandbox contract
                </h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
                  Change the language from the room toolbar — the whole room follows, and
                  the run request uses the same isolated execution path.
                </p>
              </div>
            </Reveal>

            <div className="space-y-3">
              {RUNTIMES.map((rt, i) => (
                <Reveal key={rt.id} delay={i * 70}>
                  <div className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent/40">
                    <span
                      className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas font-mono text-[11px] font-semibold uppercase ${rt.tint}`}
                    >
                      .{rt.id === "javascript" ? "js" : rt.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <h3 className="font-display text-base font-bold text-fg">{rt.name}</h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          {rt.version}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted">{rt.body}</p>
                      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full ${rt.bar} opacity-70 transition-all duration-500 group-hover:opacity-100`}
                          style={{ width: `${62 + i * 14}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default WorkflowSection;
