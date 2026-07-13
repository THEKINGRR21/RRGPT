# RRGpt - Development Rules & Protocol

## Non-Negotiable Constraints

1. **No fabrication**: If you don't know an API's current signature, open the browser and read the actual docs before writing code. Never invent function names, package versions, or config keys.
2. **No placeholders in shipped code**: No `// TODO: implement this`, no mock data left in a real code path. If something is stubbed, it goes in a `KNOWN_GAPS.md` file, not silently into the repo.
3. **Secrets live in `.env.local` only**: Never hardcode a key. Ship a `.env.example` with every variable documented.
4. **TypeScript strict mode on**: No `any` unless justified with a comment. Build must pass `tsc --noEmit` and `eslint` with zero errors before you call a phase done.
5. **Every phase ends verified in the browser**: Use your browser tool to actually load the app, click through the flow, and capture a screenshot artifact. "The code compiles" is not verification.
6. **Small commits**: Conventional commits (`feat:`, `fix:`, `chore:`). One commit per logical unit.

## Execution Protocol

1. **Clarifying Questions**: First, ask up to 5 clarifying questions that would actually change the architecture. Then stop and wait. (Completed)
2. **Implementation Plan**: Produce an Implementation Plan artifact (`implementation_plan.md`) describing phases, file-level changes, risks, and open questions. Wait for approval before writing code.
3. **Task List**: Maintain a task list artifact (`task.md`) and keep it updated as you go.
4. **Phase-by-Phase Work**: Work one phase at a time. At the end of each phase:
   - Run typecheck, lint, and tests.
   - Launch the app and verify the flow in the browser.
   - Capture a screenshot artifact of the working feature.
   - Post a short changelog: what changed, what's verified, what's still open.
   - Stop and wait for user go-ahead. Do not run ahead into the next phase.
5. **Permissions**: Ask permission before installing a new dependency not in the stack table, running any destructive terminal command, or changing the database schema after Phase 3.
6. **Stuck Rule**: If you get stuck twice on the same error, stop and tell the user — don't thrash.
