/**
 * ChatPanel — the 28% left panel in the ARKEN split layout.
 *
 * Forwards onHXDesignStarted to ChatContainer so it can call
 * connectStream(streamUrl, sessionId) when it receives the
 * hx_design_started SSE event from the backend.
 */

import ChatContainer from './ChatContainer';

export default function ChatPanel({ onHXDesignStarted, reportPending, pendingReport, onReportConsumed, sendMessageRef }) {
  return (
    <ChatContainer
      onHXDesignStarted={onHXDesignStarted}
      reportPending={reportPending}
      pendingReport={pendingReport}
      onReportConsumed={onReportConsumed}
      sendMessageRef={sendMessageRef}
    />
  );
}
