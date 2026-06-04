# voice-bi

A voice-first business intelligence agent for micro-business owners. The owner has a live
spoken conversation with the agent and gets spoken answers back, plus an interactive UI
generated on the spot (shown on screen, or sent as an image + link).

> Status: **planning stage**. This repo currently contains the build plan and a flowchart.
> Application code is added per the milestones in [`PLAN.md`](./PLAN.md).

## Contents

- [`PLAN.md`](./PLAN.md) — full build plan (Pattern B architecture), broken into milestones.
- [`flowchart.html`](./flowchart.html) — standalone HTML+SVG+CSS flowchart of how the tool
  works (no external libraries). Open it in any browser.

## Architecture at a glance

- **Live voice loop:** GPT-Realtime-2 via the OpenAI Agents SDK (speech-to-speech, WebRTC).
- **The brain:** Claude + [`json-render`](https://github.com/vercel-labs/json-render) behind a
  tool, driven by the Vercel AI SDK `generateObject` (returns a spoken summary + a validated
  UI spec).
- **UI:** rendered interactively on screen, or as an image card + link when there's no screen.
- **Transcript:** the conversation is transcribed and saved after the call.

See [`PLAN.md`](./PLAN.md) for the full details and milestones.
