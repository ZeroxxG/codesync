# Prompts to paste into the coding agent (for you, not the agent)

Run one phase per session, or use `/clear` between phases. The agent loads `CLAUDE.md`
automatically. Review the plan before approving it, and review the diff before moving on.

## Session 0: first message
```
Read CLAUDE.md and docs/PROJECT_BRIEF.md. Set up the git remote as described in CLAUDE.md,
then create the initial project skeleton only: docker-compose.yml with Postgres and Redis,
a Makefile with dev/test/lint targets, and empty app folders with minimal READMEs. Don't
start Phase 1 yet. Commit in small steps and push each one.
```

## Phase 1
Plan:
```
Read CLAUDE.md, docs/PROGRESS.md and the Phase 1 section of docs/PROJECT_BRIEF.md.
Propose a plan for Phase 1 (folder structure, files, order of commits). Wait for my OK.
Don't write code yet.
```
After you approve:
```
Plan approved. Implement Phase 1 following the git workflow in CLAUDE.md. Stop when the
Phase 1 acceptance criteria pass, update docs/PROGRESS.md, and give me a summary.
```

## Phase 2
```
Phase 1 is reviewed. Read docs/PROGRESS.md and the Phase 2 section of docs/PROJECT_BRIEF.md.
Propose a plan and wait for my OK. Don't write code yet.
```
Then: `Plan approved. Implement Phase 2 following the git workflow. Stop when the acceptance criteria pass and update docs/PROGRESS.md.`

## Phase 3 (most important, give it a fresh session)
Step 1, risk list before any code:
```
Read CLAUDE.md, docs/PROGRESS.md and the Phase 3 section of docs/PROJECT_BRIEF.md.
Before proposing a plan, list every way you can think of that user-submitted code could
escape or abuse the sandbox, the runner or the queue (resource exhaustion, escape,
data exfiltration, queue abuse, cross-job interference). Don't write code yet.
```
Compare that list with your own threat model, then:
```
Good. Now propose the Phase 3 plan, including how each risk is mitigated and tested.
Wait for my OK.
```
Then: `Plan approved. Implement Phase 3 following the git workflow. Do not skip any adversarial test. Stop when all pass and update docs/PROGRESS.md.`

## Phase 4
```
Phase 3 is reviewed. Read docs/PROGRESS.md and the Phase 4 section of docs/PROJECT_BRIEF.md.
Propose a plan and wait for my OK. Benchmark numbers must come from real runs, never invented.
```
Then: `Plan approved. Implement Phase 4 following the git workflow. Stop when the acceptance criteria pass and update docs/PROGRESS.md.`

## Phase 5
```
Phase 4 is reviewed. Read docs/PROGRESS.md and the Phase 5 section of docs/PROJECT_BRIEF.md.
Propose a short plan and wait for my OK.
```
Then: `Plan approved. Implement Phase 5 following the git workflow and update docs/PROGRESS.md.`

## Final wrap-up
```
All phases are done. Check the Definition of done in docs/PROJECT_BRIEF.md item by item and
tell me what's missing. Then write 4-5 resume bullets using only measured numbers from
docs/BENCHMARKS.md, and a list of likely interview questions with short answers drawn
from docs/DESIGN.md.
```

## If the agent goes off track
```
Stop. Re-read CLAUDE.md and the current phase in docs/PROJECT_BRIEF.md. Tell me which rule
or requirement you were about to break, then continue the correct way.
```
