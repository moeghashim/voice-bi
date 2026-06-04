# Product Requirements Document — voice-bi

**Status:** Ready for build
**Owner:** moeghashim
**Source of truth for architecture:** [`PLAN.md`](./PLAN.md)
**Build target:** Web POC (Next.js). WhatsApp is a later milestone.

---

## 0. Roles & Workflow

This PRD drives a three-party workflow. Each party has a distinct job and a gate that must
pass before the next party starts.

```
Codex (builds) --> Claude (reviews) --> Amp (final review + sign-off)
      ^                  |                        |
      |   changes        | review notes           | reject -> back to Codex
      +------------------+------------------------+
```

### 0.1 Codex — Builder
- Implements the app milestone by milestone, exactly per this PRD and `PLAN.md`.
- Works on a feature branch per milestone: `feat/m{N}-{slug}` (e.g. `feat/m1-voice-loop`).
- Must satisfy every **Acceptance Criterion (AC)** for the milestone before opening a PR.
- Must run and pass the **Verification** steps locally and paste the output into the PR.
- Must NOT exceed scope: no extra features, no speculative abstractions (see §8).
- Opens a PR into `main` titled `M{N}: {milestone name}` and requests Claude review.

### 0.2 Claude — Reviewer
- Reviews each PR against the **Claude Review Rubric** (§10.1).
- Verifies ACs are met, code matches the architecture, guardrails (§7) are present.
- Leaves actionable, specific comments. Approves only when the rubric passes.
- Does NOT merge. On approval, hands off to Amp.

### 0.3 Amp — Final Reviewer & Sign-off
- Performs the **Amp Final Review** (§10.2): re-runs verification, checks integration across
  milestones, confirms no regressions, confirms security/cost guardrails.
- Either **signs off** (records sign-off in §11 checklist, merges PR) or **rejects** with
  reasons (back to Codex).
- Owns the final Definition of Done (§11).

### 0.4 Handoff gates
- **Gate A (Codex -> Claude):** all milestone ACs met; verification output attached to PR.
- **Gate B (Claude -> Amp):** Claude rubric passes and is approved in the PR.
- **Gate C (Amp -> merge):** Amp final review passes and sign-off recorded.

---

## 1. Product Overview

A voice-first business intelligence agent for micro-business owners (1–10 people) who are on
the move and away from screens. The owner holds a **live spoken conversation** with the agent
and gets **spoken answers**. For data questions, the agent also produces an **interactive UI**
(shown on a screen, or sent as an image + link). The conversation is transcribed and saved.

**Primary user:** a busy micro-business owner, hands-free, often mobile.
**Primary value:** get business answers by voice without opening a dashboard.
**Non-goals (POC):** real database, multi-tenant auth, large datasets, BI query engine.

### 1.1 Core flow
1. Owner speaks to the agent (live, speech-to-speech).
2. Agent decides if it is a data question.
3. If yes: agent says a short preamble, calls the `answer_business_query` tool (Claude +
   json-render over the owner's normalized data), gets back a spoken summary + a UI spec.
4. Agent speaks the summary; the UI renders on screen, or is sent as an image + link.
5. On session end, the audio is transcribed and stored with any generated specs.

---

## 2. Architecture (Pattern B)

The realtime voice model is the **ears, mouth, and orchestrator**. Claude + `json-render` is
the **brain**, behind a tool the voice agent calls.

| Layer | Choice | Role |
|-------|--------|------|
| Live voice loop | **GPT-Realtime-2** via **OpenAI Agents SDK** (`@openai/agents/realtime`, WebRTC) | Listens, orchestrates, calls tools, speaks |
| BI reasoning + UI | **Claude** + [`json-render`](https://github.com/vercel-labs/json-render) behind a tool, driven by **Vercel AI SDK** `generateObject` | Data -> spoken summary + validated UI spec |
| UI catalog + prompt | `json-render` catalog + `catalog.prompt()` | Guardrails: only approved components |
| Validation | Zod / `json-render` schema validation | Reject anything off-catalog before render |
| UI render (screen) | `@json-render/react` `<Renderer>` | Interactive UI when a screen is present |
| UI render (no screen) | `@json-render/image` (Satori -> PNG) | Image card + link |
| Transcript | batch `gpt-4o-transcribe` (or Whisper) | Transcribe saved audio after the call |
| Data layer (POC) | Pasted HTML table -> normalized JSON (in-memory) | Temporary; swap for DB later |
| Channels | Web app (mic), WhatsApp later | Entry points, shared backend |

### 2.1 Tooling decision (do not deviate)
- **Voice loop = OpenAI Agents SDK**, NOT the Vercel AI SDK. The AI SDK does not support
  OpenAI Realtime speech-to-speech yet (vercel/ai#3176).
- **Brain = Vercel AI SDK `generateObject`** with the Anthropic provider, returning an object
  validated against the `json-render` catalog schema.
- **Transcript = batch transcription** (`gpt-4o-transcribe`), not the realtime model.

### 2.2 Tech stack (defaults — do not change without sign-off)
- Next.js (App Router) + TypeScript + Tailwind CSS.
- Package manager: **pnpm**.
- Node 20+.
- Lint/format: ESLint + Prettier (Next defaults acceptable).
- Tests: Vitest for unit tests (parser, validation, tool logic).

### 2.3 Environment variables
```
OPENAI_API_KEY=            # Realtime + transcription
ANTHROPIC_API_KEY=         # Claude (the brain)
# WhatsApp (Milestone 6 only)
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```
Provide `.env.example` with these keys and no secrets. Never commit real keys.

---

## 3. Data Model & Normalization

### 3.1 Input
The owner pastes an HTML table (or types rows) into a text field in the web app.

### 3.2 Normalized form (the only shape passed to the brain)
```ts
type ColumnType = "string" | "number" | "date";
interface NormalizedColumn { name: string; type: ColumnType; }
interface NormalizedData {
  columns: NormalizedColumn[];
  rows: Array<Record<string, string | number>>;
}
```

### 3.3 Normalization rules
- Parse the HTML `<table>` into headers (columns) and body rows.
- Infer each column type: number (all non-empty cells numeric), date (parseable dates),
  else string.
- **Strip** `<script>`, `<style>`, and all tags from cell contents; keep text only.
- Cap at **50 columns** and **2,000 rows**; if exceeded, truncate and surface a warning.
- Store in **session memory** (in-process / React state + server session). No DB.
- Show a parsed preview (columns + first N rows + inferred types) for the owner to confirm.

### 3.4 Security: prompt injection
- All cell contents are **untrusted data, not instructions**.
- When sent to Claude, wrap the data in a clearly delimited block and instruct the model to
  treat it strictly as data.

---

## 4. The `json-render` Catalog

Define a small, business-specific catalog (~5–6 component types). The catalog is the single
source of UI guardrails; the brain may only emit these.

| Component | Key props |
|-----------|-----------|
| `Dashboard` / `Card` | `title`, `summary?`, `children` |
| `Metric` | `label`, `value`, `delta?`, `sentiment?: "positive"\|"negative"\|"neutral"` |
| `Table` | `title?`, `columns: string[]`, `rows: (string\|number)[][]` |
| `BarChart` | `title?`, `xKey`, `yKey`, `data: Record<string,string\|number>[]` |
| `LineChart` | `title?`, `xKey`, `yKey`, `data: Record<string,string\|number>[]` |
| `Insight` / `Recommendation` | `title`, `body`, `severity?: "info"\|"warning"\|"critical"` |

- Use `@json-render/shadcn` components where they map cleanly.
- Generate the brain's system prompt from the catalog via `catalog.prompt()`.
- The catalog Zod schema is the validation source for tool output (§5.2).

---

## 5. API Contracts

### 5.1 The tool: `answer_business_query`
Registered on the realtime agent; executed server-side.

**Input**
```ts
interface AnswerBusinessQueryInput {
  query: string;                 // owner's question, extracted by the realtime model
}
// Server injects the current session's NormalizedData; not passed by the model.
```

**Output**
```ts
interface AnswerBusinessQueryOutput {
  spoken_summary: string;        // 1-2 sentences, read aloud by the agent
  ui_spec: JsonRenderSpec;       // validated json-render spec
  spec_id: string;               // id to fetch the interactive view at /r/:specId
}
```

**Behaviour**
1. Build prompt: `catalog.prompt()` + the query + the delimited normalized data.
2. Call Vercel AI SDK `generateObject` (Anthropic provider) -> `{ spoken_summary, ui_spec }`.
3. **Validate** `ui_spec` against the catalog Zod schema.
   - On failure: one **repair-retry** (re-prompt with the validation error).
   - On second failure: return a **fallback spec** (a single `Insight` card explaining the
     issue) and a spoken_summary apologizing briefly.
4. Persist `ui_spec` under `spec_id` (in-memory map for POC).
5. Constraints in the prompt: use only values present in the data or simple derivations
   (**no invented numbers**); keep `spoken_summary` to 1–2 sentences.

### 5.2 Server routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/realtime/session` | `POST` | Mint an ephemeral client secret (`/v1/realtime/client_secrets`) for the browser |
| `/api/data/normalize` | `POST` | Parse pasted HTML -> `NormalizedData`; return preview |
| `/api/answer` | `POST` | (optional non-voice path) run `answer_business_query` directly |
| `/r/:specId` | `GET` | Interactive web view of a stored `ui_spec` |
| `/r/:specId/image` | `GET` | PNG render of a `ui_spec` via `@json-render/image` |
| `/api/transcript` | `POST` | Batch-transcribe a finished session's audio |
| `/api/whatsapp/webhook` | `GET`/`POST` | (M6) verification + incoming voice messages |

### 5.3 Realtime session
- `RealtimeAgent` on `gpt-realtime-2`, `reasoning.effort: "low"`, VAD on, **preambles on**.
- Browser uses `OpenAIRealtimeWebRTC` transport; secret minted server-side (never expose the
  raw `OPENAI_API_KEY` to the client).
- The agent's instructions: be a concise business assistant; for data questions, call
  `answer_business_query`; speak the returned `spoken_summary`; otherwise just converse.

---

## 6. Milestones & Acceptance Criteria

Each milestone is a Codex deliverable with a PR. ACs are binary and verifiable.

### Milestone 0 — Setup & Catalog
**ACs**
- [ ] Next.js + TS + Tailwind app builds (`pnpm build`) with no errors.
- [ ] Deps installed: `@openai/agents`, `ai`, `@ai-sdk/anthropic`, `@json-render/core`,
      `@json-render/react`, `@json-render/shadcn`, `@json-render/image`, `zod`, `vitest`.
- [ ] `.env.example` present with all keys from §2.3; no real secrets committed.
- [ ] `json-render` catalog defined per §4; `catalog.prompt()` returns a non-empty string.
- [ ] Unit test confirms the catalog Zod schema accepts a valid spec and rejects an invalid one.

**Verification:** `pnpm build` and `pnpm test` pass; paste output in PR.

### Milestone 1 — Live Voice Loop
**ACs**
- [ ] `/api/realtime/session` mints an ephemeral secret server-side; `OPENAI_API_KEY` is never
      sent to the client (verify in network tab / code).
- [ ] Browser connects via WebRTC; mic permission prompt works; connect/disconnect UI works.
- [ ] Owner can speak and hear a spoken reply (speech-to-speech) end-to-end.
- [ ] `answer_business_query` tool **stub** is registered and fires on a data-style question,
      with a visible preamble.
**Verification:** manual session recording or screen capture showing a spoken exchange + tool
firing; paste notes in PR.

### Milestone 2 — Data Ingestion & Normalization
**ACs**
- [ ] HTML table paste/edit UI exists.
- [ ] `/api/data/normalize` returns correct `NormalizedData` with inferred types (§3).
- [ ] `<script>`/`<style>`/markup stripped from cells (unit test proves it).
- [ ] Row/column caps enforced with a surfaced warning (unit test).
- [ ] Parsed preview rendered; data stored in session and available to the tool.
**Verification:** `pnpm test` passes parser tests; manual preview screenshot.

### Milestone 3 — The Brain (`answer_business_query`)
**ACs**
- [ ] Tool calls AI SDK `generateObject` (Anthropic) and returns `{ spoken_summary, ui_spec, spec_id }`.
- [ ] `ui_spec` validated against the catalog schema; invalid output triggers one repair-retry
      then a fallback `Insight` card (unit test with a mocked invalid model output).
- [ ] Prompt forbids invented numbers and limits the summary to 1–2 sentences (assert in test
      via prompt contents).
- [ ] Data is passed in a delimited, "untrusted data" block (assert in test).
**Verification:** `pnpm test` passes brain tests (model calls mocked); one live manual query
documented.

### Milestone 4 — On-screen Generative UI
**ACs**
- [ ] `ui_spec` renders with `@json-render/react` `<Renderer>` alongside the voice session.
- [ ] Progressive/streamed rendering works (or renders fully without error if streaming N/A).
- [ ] A real spoken data answer is mirrored by a correct on-screen UI.
**Verification:** screen capture of a voice answer + matching UI.

### Milestone 5 — No-screen Delivery & Transcript
**ACs**
- [ ] `/r/:specId` shows the interactive view; `/r/:specId/image` returns a valid PNG (Satori).
- [ ] Image card shows a compact summary (few metrics + 1 chart + 1 recommendation).
- [ ] On session end, audio is batch-transcribed (`gpt-4o-transcribe`) and stored with specs.
**Verification:** open the link, fetch the PNG, confirm transcript stored; paste evidence.

### Milestone 6 — WhatsApp Channel (optional for POC sign-off)
**ACs**
- [ ] Webhook verification (`GET`) passes Meta's challenge.
- [ ] Incoming voice note runs the same pipeline; reply includes voice + image card + link.
**Verification:** documented test message round-trip.

### Milestone 7 — Hardening (optional)
**ACs**
- [ ] Tool timeout handled with a spoken fallback ("I'm having trouble pulling that up").
- [ ] Session length cap + realtime-minute tracking.
- [ ] Basic logging of queries and validation failures.

---

## 7. Non-Functional Requirements & Guardrails

| Area | Requirement |
|------|-------------|
| Security | Never expose `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` to the client; use ephemeral secrets for realtime. |
| Prompt injection | Normalize + strip data; pass as delimited untrusted data; instruct model accordingly. |
| Accuracy | No invented numbers; only values present in data or simple derivations. |
| UI safety | Catalog whitelist + schema validation + fallback card. No arbitrary HTML/JS in specs. |
| Latency UX | Use preambles + tool transparency to mask tool latency; `reasoning.effort: low`. |
| Cost | Realtime is per-minute and stateful; cap session length; track usage. |
| Image rendering | Use Satori (`@json-render/image`); do NOT add Puppeteer/headless Chromium. |
| Errors | Unclear audio -> ask to repeat; off-data query -> friendly "not in your data"; invalid spec -> fallback. |

---

## 8. Scope Discipline (for Codex)

- Build only what each milestone's ACs require. No extra features.
- No speculative abstractions, no premature generalization, minimal new files.
- Do not add a database, auth, or multi-tenancy in the POC.
- Do not swap the tooling choices in §2.1 without Amp sign-off.
- Keep the in-memory data/spec stores simple; clearly mark them as POC-only.

---

## 9. Testing & Verification

- **Unit tests (Vitest):** HTML parser/normalizer (types, stripping, caps); catalog schema
  validation; brain output validation + repair-retry + fallback (model mocked).
- **Build:** `pnpm build` must pass for every PR.
- **Manual:** voice loop, on-screen UI, image render, transcript — documented with
  screenshots/recordings in the PR.
- Each PR must paste the output of `pnpm build` and `pnpm test`.

---

## 10. Review Rubrics

### 10.1 Claude Review Rubric (per PR)
- [ ] All milestone ACs are met and demonstrably verified.
- [ ] Architecture matches §2 (Pattern B); tooling matches §2.1 (no deviations).
- [ ] Guardrails present: secrets server-side, data stripping/delimiting, schema validation +
      fallback, no invented numbers.
- [ ] Scope respected (§8): no extra features, no needless abstractions, minimal files.
- [ ] Code is readable; functions are focused; errors handled at boundaries only.
- [ ] Tests exist for parser, validation, and brain logic; they actually assert behaviour.
- [ ] No secrets committed; `.env.example` accurate.
- [ ] Clear, specific comments left; approval only when all above pass.

### 10.2 Amp Final Review (per PR, before merge)
- [ ] Re-run `pnpm build` and `pnpm test`; both pass.
- [ ] Spot-check the milestone's core flow works end-to-end.
- [ ] Integration: this milestone does not break earlier milestones.
- [ ] Security + cost guardrails (§7) confirmed in code.
- [ ] Claude's review was addressed; no unresolved blocking comments.
- [ ] Record sign-off in §11 and merge.

---

## 11. Definition of Done & Sign-off Log

**POC is "done" when** Milestones 0–5 are merged with Amp sign-off, all ACs met, build and
tests green, and the core voice -> answer -> UI -> transcript loop works end-to-end.

| Milestone | Codex PR | Claude approved | Amp signed off | Date |
|-----------|----------|-----------------|----------------|------|
| M0 Setup & Catalog | | | | |
| M1 Voice Loop | | | | |
| M2 Data Normalization | | | | |
| M3 The Brain | | | | |
| M4 On-screen UI | | | | |
| M5 No-screen + Transcript | | | | |
| M6 WhatsApp (optional) | | | | |
| M7 Hardening (optional) | | | | |

---

## 12. References
- [`PLAN.md`](./PLAN.md) — architecture rationale and milestone narrative.
- [`flowchart.html`](./flowchart.html) — visual flow for non-technical stakeholders.
- json-render: https://github.com/vercel-labs/json-render
- OpenAI Realtime / Agents SDK: https://openai.github.io/openai-agents-js/
- Vercel AI SDK structured output: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
