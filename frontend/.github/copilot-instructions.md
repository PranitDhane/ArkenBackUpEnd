# ARKEN AI - Frontend: Copilot Instructions

## Project Overview

React + Vite frontend for AI-powered process simulation chat interface. This is ONE component in a larger multi-service architecture (see workspace-level `../.github/copilot-instructions.md` for full system context).

**Current Status**: **NOT YET IMPLEMENTED** - Placeholder Vite + React template only

**Role in System**:

- Provides chat UI for users to interact with process simulation
- Consumes SSE (Server-Sent Events) from backend for real-time updates
- Displays thinking indicators, tool execution cards, simulation progress
- Renders streaming LLM responses with Markdown support

**This service**:

- ✅ Calls: Backend API (HTTP + SSE)
- ❌ Does NOT call: MCP server, calculation engine, MongoDB, Redis directly
- ❌ Does NOT handle: Tool execution, policy enforcement, simulation logic

## Planned Architecture

### Component Structure (Phase 8 - Not Yet Built)

```
src/
├── components/
│   ├── ChatThread.jsx           # Main chat container
│   ├── ThinkingIndicator.jsx    # thinking.start/end display
│   ├── ToolExecutionCard.jsx    # tool.start/end cards
│   ├── RunProgressBar.jsx       # run.progress visualization
│   ├── StreamingBubble.jsx      # message.delta streaming text
│   ├── MarkdownRenderer.jsx     # message.final with react-markdown
│   └── MessageInput.jsx         # User input field
├── hooks/
│   ├── useSSE.js                # EventSource connection & event handling
│   └── useChatState.js          # Chat state management (Context API)
├── utils/
│   ├── api.js                   # Backend API client (fetch wrapper)
│   └── eventHandlers.js         # SSE event type routing
└── styles/
    └── tailwind.css             # Tailwind utilities
```

### State Management Pattern

**Context API** (simple, no external state library needed):

```jsx
// ChatContext.js
const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [runProgress, setRunProgress] = useState(null);

  // SSE event handlers update state
  const handleThinkingStart = () => setIsThinking(true);
  const handleToolStart = (data) => setActiveTool(data);

  return (
    <ChatContext.Provider value={{messages, isThinking, ...}}>
      {children}
    </ChatContext.Provider>
  );
}
```

### SSE Event Handling Pattern

```jsx
// useSSE.js hook
export function useSSE(requestId) {
  const { handleEvent } = useChatState();

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:8001/api/chat/${requestId}/stream`
    );

    // Register handlers for each event type
    eventSource.addEventListener("thinking.start", (e) => {
      handleEvent("thinking.start", JSON.parse(e.data));
    });

    eventSource.addEventListener("tool.start", (e) => {
      handleEvent("tool.start", JSON.parse(e.data));
    });

    eventSource.addEventListener("message.delta", (e) => {
      handleEvent("message.delta", JSON.parse(e.data));
    });

    // Cleanup on unmount
    return () => eventSource.close();
  }, [requestId]);
}
```

## Event Types to Handle

All events from backend (see `backend/app/models/events.py`):

| Event Type       | UI Behavior                                       |
| ---------------- | ------------------------------------------------- |
| `thinking.start` | Show global spinner/"thinking" indicator          |
| `thinking.end`   | Hide spinner                                      |
| `tool.start`     | Show tool execution card with name, args          |
| `tool.end`       | Update card with status (success/error), duration |
| `run.status`     | Update simulation status badge                    |
| `run.progress`   | Update progress bar (equipment, percentage)       |
| `app.error`      | Show error toast/banner                           |

**Note**: Final LLM responses are returned in the HTTP POST response body (not via SSE events).
`message.delta` and `message.final` events are defined but not currently implemented.

## API Integration

### Backend Endpoints

```javascript
// api.js
const API_BASE = "http://localhost:8001/api";

export async function sendMessage(conversationId, message) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

  const { request_id } = await response.json();
  return request_id; // Use for SSE stream subscription
}

export function connectSSE(requestId) {
  return new EventSource(`${API_BASE}/chat/${requestId}/stream`);
}
```

## Styling Strategy

**Tailwind CSS** for all styling (no CSS modules, no styled-components):

```jsx
// Example: ToolExecutionCard.jsx
export function ToolExecutionCard({ tool }) {
  return (
    <div className="border border-gray-300 rounded-lg p-4 my-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-700">{tool.name}</span>
        {tool.status === "running" && (
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent" />
        )}
        {tool.status === "success" && <span className="text-green-600">✓</span>}
      </div>
      {tool.duration && (
        <span className="text-xs text-gray-500">{tool.duration}ms</span>
      )}
    </div>
  );
}
```

## Markdown Rendering

**react-markdown** with **remark-gfm** for GitHub Flavored Markdown:

```jsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none"
    >
      {content}
    </ReactMarkdown>
  );
}
```

Supports:

- Tables
- Task lists
- Strikethrough
- Code blocks with syntax highlighting (needs `rehype-highlight`)

## Development Workflow

### Running Frontend (Not Yet Implemented)

```bash
cd frontend
npm install
npm run dev

# Opens at http://localhost:5173
```

### Project Setup (When Starting Phase 8)

```bash
# Already created with Vite template
npm create vite@latest frontend -- --template react

# Install dependencies
npm install
npm install -D tailwindcss postcss autoprefixer
npm install react-markdown remark-gfm
npm install date-fns

# Configure Tailwind
npx tailwindcss init -p
```

## Key UI/UX Requirements

### Message Display Patterns

**User Message**:

```jsx
<div className="flex justify-end">
  <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-md">
    {message.content}
  </div>
</div>
```

**Assistant Message (From HTTP Response)**:

```jsx
<div className="flex justify-start">
  <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-2xl">
    <MarkdownRenderer content={response.content} />
  </div>
</div>
```

**Tool Execution Card**:

```jsx
<div className="border-l-4 border-blue-500 bg-blue-50 p-3 my-2">
  <div className="flex items-center space-x-2">
    <ToolIcon name={tool.name} />
    <span className="font-medium">Running: {tool.name}</span>
  </div>
  {tool.status === "success" && (
    <div className="mt-2 text-sm text-gray-600">
      Completed in {tool.duration}ms
    </div>
  )}
</div>
```

**Simulation Progress**:

```jsx
<div className="w-full bg-gray-200 rounded-full h-2.5">
  <div
    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
    style={{ width: `${progress.percentage}%` }}
  />
</div>
<p className="text-xs text-gray-600 mt-1">
  Processing: {progress.equipment} ({progress.percentage}%)
</p>
```

## Error Handling

```jsx
// Error boundary for unexpected crashes
export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-700">
          Something went wrong. Please refresh.
        </div>
      );
    }
    return this.props.children;
  }
}

// Toast notifications for app.error events
import { toast } from "react-hot-toast";

eventSource.addEventListener("app.error", (e) => {
  const { message } = JSON.parse(e.data);
  toast.error(message, { duration: 5000 });
});
```

## Testing Strategy (When Implemented)

**Recommended**:

- **Vitest** for unit tests (built into Vite)
- **React Testing Library** for component tests
- **MSW (Mock Service Worker)** for API mocking

```javascript
// Example test
import { render, screen } from "@testing-library/react";
import { ToolExecutionCard } from "./ToolExecutionCard";

test("shows running spinner when tool is executing", () => {
  render(<ToolExecutionCard tool={{ name: "simulate", status: "running" }} />);
  expect(screen.getByText("simulate")).toBeInTheDocument();
  expect(screen.getByRole("status")).toBeInTheDocument(); // spinner
});
```

## Common Pitfalls (When Development Starts)

1. **Don't poll for updates** - Use SSE EventSource, not setInterval
2. **Don't store all events** - Only store current message/tool state, not full event history
3. **SSE reconnection** - EventSource auto-reconnects, but handle `onerror` for UX feedback
4. **Memory leaks** - Always close EventSource in cleanup (`return () => eventSource.close()`)
5. **CORS** - Backend must include frontend origin in `CORS_ORIGINS` env var

## Key Files to Reference

- `backend/architecture-mcpChatInterface.md` - Event protocol specification
- `backend/app/models/events.py` - Event schemas and payloads
- Standard Vite + React documentation

## Current Status

**Phase 8 (Not Started)**: Frontend development blocked until backend Phase 7 complete

**What exists now**:

- ✅ Vite + React template (default)
- ✅ Basic package.json
- ❌ No components implemented
- ❌ No SSE integration
- ❌ No Tailwind configured
- ❌ No state management

**Next steps (when Phase 8 starts)**:

1. Configure Tailwind CSS
2. Create ChatContext provider
3. Implement useSSE hook
4. Build core components (ChatThread, MessageInput, etc.)
5. Integrate with backend SSE streams

---

**Version**: Frontend-specific instructions | **Last Updated**: 16 January 2026
