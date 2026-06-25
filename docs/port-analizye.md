# Task: Build a streaming "Analyze Portfolio" feature against our backend

We have a backend endpoint that streams an AI-generated portfolio analysis token-by-token
over Server-Sent Events (SSE). Build the frontend that calls it and renders the text as it
arrives. Follow this project's existing conventions, component patterns, and API-client setup.

## Endpoint

- **Method/URL:** `POST /api/v1/portfolio/analyze`
- **Auth:** Protected — send the user's Google ID token as `Authorization: Bearer <token>`
  (same auth as our other `/api/v1/portfolio/*` calls; reuse the existing auth/token helper).
- **Response:** `Content-Type: text/event-stream` (SSE). The body streams chunks and ends
  with a literal `data: [DONE]` line.

## Request body

  ```json
  {
    "portfolio": {
      "name": "Dividend Growth Portfolio",
      "description": "Income-focused, low-volatility ETF mix for long-term compounding",
      "holdings": [
        { "ticker": "JEPI", "actual": 42, "target": 34 },
        { "ticker": "DGRO", "actual": 28, "target": 33 },
        { "ticker": "SCHY", "actual": 30, "target": 33 }
      ]
    },
    "dimensions": ["concentration risk", "drift detection", "rebalancing actions"]
  }
  ```

Field rules (backend validates these and returns 400 if violated):
- `portfolio.name` — required, non-empty string.
- `portfolio.description` — optional string (free-text context for the analysis).
- `portfolio.holdings` — required, at least 1 item; each item needs a non-empty `ticker`
  and `actual` / `target` numbers `>= 0` (percent weights).
- `dimensions` — required, at least 1 non-empty string.

## Consuming the stream (important)

The browser's `EventSource` API only supports GET, so it **cannot** be used here. Use
`fetch()` with a streaming body reader instead:

1. `fetch(url, { method: "POST", headers: { Authorization, "Content-Type": "application/json" }, body })`.
2. **Check for a pre-stream error BEFORE reading the stream** (see Errors below) — if
   `!response.ok`, parse the JSON error body and surface it; do not start streaming.
3. Read `response.body.getReader()`, decode chunks with `TextDecoder`, and buffer by lines.
4. Each SSE data line looks like: `data: {...OpenAI-compatible chunk JSON...}`.
   The text token is at `choices[0].delta.content` (may be absent on some frames — skip those).
   Accumulate `content` into the displayed analysis text.
5. Stop when you receive `data: [DONE]`.
6. Support cancellation: pass an `AbortController` signal to `fetch` so navigating away or
   clicking "Stop" aborts the request (the backend cancels the upstream call on disconnect).

Example chunk payload (OpenAI/Groq format) you'll parse:
  ```
  data: {"choices":[{"delta":{"content":"This portfolio is"},"index":0}]}
  data: {"choices":[{"delta":{"content":" heavily concentrated"},"index":0}]}
  data: [DONE]
  ```

## Errors

Errors that happen **before** streaming starts come back as our standard JSON envelope
(not SSE), with the matching HTTP status:
  ```json
  { "result": null, "code": 400, "message": "Error", "errorMessage": "..." }
  ```
Handle these statuses distinctly in the UI:
- **400** — invalid request (validation). Show the `errorMessage`.
- **429** — analysis service is rate limited. Show a "try again shortly" message.
- **502** — upstream/AI provider failure. Show a generic "couldn't generate analysis" error.
  Once a `200` stream has started, errors won't switch status; just handle an abruptly
  ended stream gracefully (render what arrived).

## UX

- A button/section that builds the request from the user's current portfolio (map our
  holdings to `{ ticker, actual, target }`) and lets them pick/confirm the `dimensions`.
- Render the analysis as it streams (live-updating text), with a loading/typing indicator
  until `[DONE]`.
- A "Stop" control that aborts the in-flight request.
- Disable the trigger while a stream is active.

## Acceptance criteria

- Posts the correct body and Bearer token; text renders progressively (not all-at-once).
- 400/429/502 each show a distinct, friendly message and never start the streaming UI.
- Stream terminates cleanly on `[DONE]`; aborting mid-stream cancels the request.
- Code follows the existing frontend structure (API client, hooks/components, types).
