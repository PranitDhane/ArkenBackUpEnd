# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARKEN is an AI-powered process engineering platform for shell-and-tube heat exchanger design. It has three services:

- **Frontend** (React 19 + Vite, port 5173) — Chat UI, HX design visualization with ReactFlow, Zustand state management, TailwindCSS v4
- **Backend** (FastAPI, port 8001) — Chat API with SSE streaming, orchestrates LLM calls (Anthropic Claude + Google Gemini), skill-based tool system, MongoDB + Redis
- **HX Design Engine** (FastAPI, port 8100) — TEMA-compliant heat exchanger design pipeline with 15 calculation steps, each backed by an AI "skill" (markdown prompt in `hx_engine/app/skills/`)

## Architecture

The backend receives chat messages and streams responses via SSE. It uses an **orchestration service** (`backend/app/services/orchestration_service.py`) that dispatches to registered tools via a **tool registry** (`backend/app/services/tool_registry.py`). The HX engine is called as a downstream service when the user requests a heat exchanger design.

The HX engine runs a multi-step design pipeline (steps 02–15 in `hx_engine/app/skills/`). Each step has a markdown skill prompt, and the engine's **AI engineer** assembles these into LLM calls. State flows through a Redis-backed context that accumulates results across steps.

Frontend uses `ChatContext` for message state and `AuthContext` for auth. Pages: `ChatPage`, `HomePage`, `LoginPage`, `SharedDesignPage`.

## Commands

### Run all services
```
make dev          # starts frontend + backend + hx_engine (Ctrl+C to stop all)
make stop         # kill services on ports 5173, 8001, 8100
```

### Run individually
```
make frontend     # cd frontend && npm run dev
make backend      # uvicorn app.main:app --port 8001 --reload (uses backend/venv)
make hxengine     # uvicorn hx_engine.app.main:app --port 8100 --reload (uses hx_design_engine/venv)
```

### Tests
```
make test-all       # everything
make test-backend   # cd backend && PYTHONPATH=. pytest
make test-hx        # cd hx_design_engine && pytest
make test-frontend  # cd frontend && npm test -- --run
```

Single test: `cd backend && PYTHONPATH=. python -m pytest tests/test_foo.py::test_bar -q`

### Docker (infra only for local dev)
```
cd docker && docker compose up -d                    # MongoDB + Redis only
cd docker && docker compose --profile app up -d      # full stack with nginx
```

### Linting
```
cd frontend && npm run lint    # ESLint
cd backend && ruff check .     # Python (ruff), line-length=100
```

## Key Conventions

- Backend Python: ruff + black, line-length 100, target Python 3.10+
- HX engine: Python 3.11+
- Backend venvs are per-service: `backend/venv/` and `hx_design_engine/venv/` (not the root `.venv`)
- pytest-asyncio with `asyncio_mode = "auto"` in both Python services
- Frontend tests use Vitest + happy-dom

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore the codebase.** The graph is faster, cheaper (fewer tokens), and gives you structural context (callers, dependents, test coverage) that file scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
