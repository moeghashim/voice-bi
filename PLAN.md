# Voice-First Business Intelligence Tool — Build Plan (v3, Pattern B)

## What We're Building

A **voice-first** business intelligence agent for micro-business owners (1–10 people) who
are on the move and away from screens. The owner has a **live spoken conversation** with the
agent — talks naturally, gets spoken answers back. When the owner asks something
data-specific ("what's my stock on SKU 12?", "who owes me money?"), the agent answers out
loud *and* generates an **interactive UI** they can glance at on a screen or receive as an
image. The full conversation is transcribed and saved at the end.

**Core idea:** Voice is the primary interface. The generative UI is a secondary artifact
that appears when a screen is available, or is pushed as an image + link.

---

## Architecture (Pattern B)

The voice model is the **ears, mouth, and orchestrator**. Claude + `json-render` is the
**brain** for business-data questions, sitting behind a tool the voice agent calls.

| Layer | Choice | Role |
|-------|--------|------|
| Live voice loop | **GPT-Realtime-2** via **OpenAI Agents SDK** (`@openai/agents/realtime`, WebRTC) | Listens, orchestrates conversation, calls tools, speaks |
| BI reasoning + UI | **Claude** + [`json-render`](https://github.com/vercel-labs/json-render) behind a tool, driven by **Vercel AI SDK** `generateObject` | Reads normalized data → spoken summary + validated UI spec |
| UI catalog + prompt | `json-render` catalog + `catalog.prompt()` | Guardrails: model can only emit approved components |
| Validation | `json-render` schema validation (Zod-backed) | Reject anything outside the catalog before render |
| UI render (screen) | `@json-render/react` `<Renderer>` | Interactive UI when a screen is present |
| UI render (no screen) | `@json-render/image` (Satori -> PNG) | Image card + link for WhatsApp / push |
| Post-call transcript | batch **Whisper / `gpt-4o-transcribe`** | Transcribe saved audio after the call ends |
| Data layer (POC) | Pasted HTML table -> **normalized JSON** (in-memory) | Temporary — swap for Shopify/DB later |
| Channels | Web app (mic) + **WhatsApp** (voice note in, voice + image out) | Two entry points, same backend |

### Why this tooling split (the AI SDK question)

- **Live voice loop -> OpenAI Agents SDK, NOT the Vercel AI SDK.** The AI SDK does not yet
  support OpenAI Realtime speech-to-speech (open issue vercel/ai#3176; its audio support is
  TTS/STT only). OpenAI's Agents SDK gives `RealtimeAgent` / `RealtimeSession` with built-in
  browser WebRTC audio and server-side tool calling.
- **The brain -> Vercel AI SDK `generateObject`.** Provider-agnostic structured output that
  pairs cleanly with the `json-render` Zod schema and lets us run Claude.
- **Transcript -> AI SDK transcription / `gpt-4o-transcribe`.** Simple batch call after the call ends.

### Why Pattern B (voice orchestrator + separate brain)

GPT-Realtime-2 ships **preambles** ("let me pull that up...") and **tool-call transparency**
("checking your latest orders...") designed to mask backend latency. That is the seam where
Claude + `json-render` plugs in. High-stakes number work stays with Claude (accuracy, tight
`json-render` integration); the realtime model only handles natural conversation. We do
**not** put data crunching inside the realtime model.

```
        Owner talks (on the move)
                  |
        audio (WebRTC / WebSocket)
                  v
          GPT-Realtime-2  <---------------- live voice agent
       listens / orchestrates / speaks      (speech <-> speech)
          |                  ^
 preamble |                  | speaks summary (voice)
"let me   v                  |
 check"   TOOL: answer_business_query
          Claude + json-render (AI SDK)  <-- the brain
          reads normalized data
          -> summary + validated UI spec
                  |
          +-------+--------+
          v                v
   screen present?   no screen / WhatsApp
   interactive UI    image card + link
          +-------+--------+
                  v
          conversation ends
          -> save transcript (batch Whisper)
```

---

## Milestones

### Milestone 0 — Project setup & catalog (foundation)
**Goal:** repo, env, and the UI guardrails exist.
- Next.js app, TypeScript, Tailwind.
- Install: `@openai/agents`, `ai` + `@ai-sdk/anthropic`, `@json-render/core` `@json-render/react`
  `@json-render/shadcn` `@json-render/image`, `zod`.
- Env: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, WhatsApp creds (later).
- Define the `json-render` **catalog**: `Metric`, `Table`, `BarChart`, `LineChart`,
  `Insight`/`Recommendation`, `Dashboard`/`Card` (~5-6 types).
- Generate the tool/system prompt with `catalog.prompt()`.
**Done when:** catalog compiles and `catalog.prompt()` returns a prompt string.

### Milestone 1 — Live voice loop (core)
**Goal:** the owner can hold a spoken conversation with the agent.
- Browser `RealtimeSession` (OpenAI Agents SDK) over WebRTC; ephemeral client secret minted
  server-side (`POST /v1/realtime/client_secrets`).
- `RealtimeAgent` configured with GPT-Realtime-2, `reasoning.effort: low`, VAD on, preambles on.
- Register one tool stub: `answer_business_query(query)` returning a canned spoken summary.
- Web UI: connect/disconnect, mic permission, live status, talk indicator.
**Done when:** you can speak, the agent replies in voice, and the tool fires on a data question.

### Milestone 2 — Data ingestion + normalization
**Goal:** business data exists in a clean, safe form.
- HTML table paste/edit field.
- Parser -> normalized JSON `{ columns:[{name,type}], rows:[...] }` with type inference.
- Parsed preview to confirm; store in session memory.
- Guardrails: cap rows/cols; strip `<script>`/`<style>`/markup; treat cells as **untrusted
  data, not instructions**, in a delimited block.
**Done when:** pasted table shows a correct typed preview and is available to the tool.

### Milestone 3 — The brain: `answer_business_query`
**Goal:** real answers + real UI specs from the data.
- Tool implementation calls Vercel AI SDK `generateObject` with Claude:
  system prompt from `catalog.prompt()` + question + delimited normalized data.
- Returns `{ spoken_summary, ui_spec }`.
- **Validate** `ui_spec` against the catalog schema; one repair-retry; else fallback card.
- Prompt rules: only use values in the data or simple derivations (**no invented numbers**);
  spoken summary 1-2 sentences (it is read aloud).
**Done when:** asking a data question yields a correct spoken answer + valid spec.

### Milestone 4 — On-screen generative UI
**Goal:** glanceable interactive UI when a screen is present.
- Render `ui_spec` with `@json-render/react` `<Renderer>`, streaming progressively.
- Layout that sits alongside the live voice session.
**Done when:** the spoken answer is mirrored by a live interactive UI.

### Milestone 5 — No-screen delivery + transcript
**Goal:** value without a screen, and a saved record.
- Render `ui_spec` -> PNG with `@json-render/image` (Satori): few metrics + 1 chart + 1 rec.
- Host an interactive view at `/r/:specId`; produce image + link.
- On session close, batch-transcribe saved audio (`gpt-4o-transcribe`); store transcript + specs.
**Done when:** an image card + working link is produced, and the transcript is saved.

### Milestone 6 — WhatsApp channel
**Goal:** second entry point.
- WhatsApp Business Cloud API webhook (with verification).
- Incoming voice note -> same agent (live via GPT-Realtime-2, or async transcribe -> tool -> TTS).
- Reply with a voice note + image card + link.
**Done when:** a WhatsApp voice note returns a voice + image + link answer.

### Milestone 7 — Hardening (optional for POC)
- Tool timeout handling + preamble messaging ("I'm having trouble pulling that up").
- Cost guardrails: cap session length; track realtime minutes.
- Basic logging/analytics on queries and validation failures.

---

## Risks & Guardrails

| Risk | Guardrail |
|------|-----------|
| Realtime model doing data math | Keep crunching in the Claude tool; realtime model only orchestrates |
| Hallucinated numbers | "Only use values in the data"; aggregate in code; short spoken summaries |
| Invalid/unsafe UI | Catalog whitelist + schema validation + fallback card |
| Prompt injection via pasted table | Parse to data, strip markup, delimit, label as untrusted |
| Tool latency in live loop | Preambles + tool transparency; tune reasoning effort |
| Cost (realtime is per-minute, stateful) | Acceptable — the live conversation *is* the product; cap session length |
| Serverless screenshotting | Use Satori (`@json-render/image`), not Puppeteer |
| AI SDK realtime gap | Use OpenAI Agents SDK for the voice loop; AI SDK only for the brain/transcript |

## Out of scope for the POC
Multi-tenant persistence, joins/date-window query engine, large datasets, role-based access.

## Deliverables in this folder
- `PLAN.md` — this plan.
- `flowchart.html` — standalone HTML+SVG+CSS flowchart (no external libraries).
