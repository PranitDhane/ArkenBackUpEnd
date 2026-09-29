# ARKEN AI — Frontend

React + Vite frontend for the ARKEN AI heat exchanger design platform. Provides a dual-panel interface: a conversational chat on the left and real-time pipeline step cards on the right.

**Dev port:** `5173`  
**Stack:** React 18, Vite, Tailwind CSS, Vitest

---

## Overview

The frontend communicates with two services simultaneously during a design run:

- **Backend** (`/api/*`) — chat messages, auth, SSE stream for Claude thinking/deltas/tool events
- **HX Engine** (`/api/v1/hx/*`) — SSE stream for live step cards (step started/approved/corrected/warning/escalated/error)

In production, nginx routes both. In development, Vite proxies `/api/*` to `localhost:8001` and `VITE_HX_ENGINE_URL` points directly to `localhost:8100`.

---

## Prerequisites

- Node.js 20+
- Backend running on port `8001`
- HX Engine running on port `8100`

---

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env        # set VITE_HX_ENGINE_URL if needed
npm run dev
```

App available at **http://localhost:5173**

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Backend API base path |
| `VITE_HX_ENGINE_URL` | `http://localhost:8100` | HX Engine base URL (dev only; nginx handles prod) |

---

## Project Structure

```
frontend/src/
├── components/
│   ├── chat/            # Chat panel (message list, input, SSE client)
│   ├── pipeline/        # StepCard components (7 visual states)
│   └── ui/              # Shared UI primitives
├── hooks/
│   ├── useHXStream.js   # EventSource hook for HX Engine pipeline SSE
│   └── useChat.js       # Chat state and Backend SSE management
├── services/
│   ├── SSEClient.js     # Imperative SSE client (chat stream)
│   └── api.js           # HTTP client for Backend REST calls
├── stores/              # Global state
└── main.jsx
```

---

## Step Card Visual States

Each pipeline step renders as a `StepCard` in one of 7 states driven by SSE events:

| State | Trigger | Visual |
|---|---|---|
| PENDING | Not yet started | Grey, no icon |
| RUNNING | `step_started` | Spinner |
| APPROVED | `step_approved` | Green ✓ |
| CORRECTED | `step_corrected` | Amber ↻ with diff |
| WARNING | `step_warning` | Yellow ⚠ with message |
| ESCALATED | `step_escalated` | Orange △ with inline decision UI |
| ERROR | `step_error` | Red ✗ |

When a step is ESCALATED, the user picks from rated options or types an override. The response is sent via `POST /api/v1/hx/design/{id}/respond`.

---

## SSE Architecture

The frontend opens **two simultaneous EventSource connections** during a design:

1. **Chat SSE** — `GET /api/chat/{id}/stream` (Backend → Redis Streams)  
   Handles: `thinking_start`, `thinking_end`, `message_delta`, `message_final`, `hx_design_started`, `app_error`

2. **Pipeline SSE** — `GET /api/v1/hx/design/{id}/stream` (HX Engine → asyncio.Queue)  
   Handles: `step_started`, `step_approved`, `step_corrected`, `step_warning`, `step_escalated`, `step_error`, `iteration_progress`, `design_complete`

The `SSEClient` for chat is created *before* the POST fires to guarantee the connection is open before events arrive.

On page refresh, the frontend restores step state by polling `GET /api/v1/hx/design/{id}/status`.

---

## Running Tests

```bash
npm run test          # Vitest (watch mode)
npm run test:run      # Vitest (single run)
npm run lint          # ESLint
```

---

## Build

```bash
npm run build         # Output to dist/
npm run preview       # Preview production build locally
```

---

## Docker

In production, the frontend is served by nginx. The Vite build is copied into the nginx image during the Docker build. See `docker/README.md` for the full stack setup.
