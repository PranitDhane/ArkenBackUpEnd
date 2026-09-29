/**
 * MessageInput Component
 * 
 * Text input with send button for composing messages.
 * Features:
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for new line
 * - Image/PDF/DOCX attachment support (paste, drag-drop, file picker)
 * - Voice input via Web Speech API (STT) — mic button with live transcription
 * - Inline attachment chips inside the input border (VS Code Copilot style)
 * - Disabled state during processing
 * - Stop/Cancel button when request is in progress
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Square, Paperclip, X, FileText, Mic } from 'lucide-react';

// Maximum total size across all attachments (20 MB)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_ATTACHMENTS = 5;

/**
 * Convert a File to an attachment object with base64 data.
 * @param {File} file
 * @returns {Promise<{media_type: string, data: string, filename: string, preview: string}>}
 */
function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result; // "data:<mime>;base64,<data>"
      const base64 = dataUrl.split(',')[1];
      const isImage = IMAGE_TYPES.includes(file.type);
      resolve({
        media_type: file.type,
        data: base64,
        filename: file.name,
        preview: isImage ? dataUrl : null, // No image preview for PDFs
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Truncate filename for chip display */
function truncateFilename(name, maxLen = 22) {
  if (!name || name.length <= maxLen) return name || 'file';
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
  const stem = name.slice(0, maxLen - ext.length - 1);
  return `${stem}…${ext}`;
}

/** Unified rounded card — manages focus-within border highlight */
function InputCard({ children, dragActive }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${dragActive ? 'var(--color-running)' : focused ? 'var(--color-border-focus)' : 'var(--color-border)'}`,
        borderRadius: '16px',
        transition: 'border-color 0.15s',
      }}
    >
      {children}
    </div>
  );
}

/** Small icon button for the toolbar row */
function ToolbarButton({ onClick, disabled, title, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-11 h-11 flex items-center justify-center transition-colors"
      style={{
        color:        active ? 'var(--color-error)' : 'var(--color-text-muted)',
        borderRadius: '8px',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}

export default function MessageInput({ 
  onSend, 
  onCancel,
  disabled = false, 
  isProcessing = false,
  placeholder = "Ask about process simulations...",
  compact = false
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);  // [{media_type, data, filename, preview, size}]
  const [dragActive, setDragActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ---- Web Speech API (STT) ----
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const speechSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    // We'll track the "final committed text" so we can show interim
    // results in the textarea without duplicating.
    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscript = message; // start from whatever is already typed
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Append final result with a space
          finalTranscript += (finalTranscript ? ' ' : '') + transcript.trim();
        } else {
          interim += transcript;
        }
      }
      // Show committed + in-progress text
      const display = interim
        ? finalTranscript + (finalTranscript ? ' ' : '') + interim
        : finalTranscript;
      setMessage(display);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      // "no-speech" and "aborted" are normal — user just stopped talking
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Focus the textarea so the user can edit/send
      textareaRef.current?.focus();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, isListening, message]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);
  
  // Auto-resize textarea (only for non-compact mode)
  useEffect(() => {
    if (compact) return;
    
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '48px';
      const newHeight = Math.max(48, Math.min(textarea.scrollHeight, 200));
      textarea.style.height = newHeight + 'px';
    }
  }, [message, compact]);
  
  // Focus textarea on mount
  useEffect(() => {
    if (!disabled && !isProcessing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, isProcessing]);

  // ---- Attachment helpers ----

  const totalAttachmentBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);

  const addFiles = useCallback(async (files) => {
    const incoming = Array.from(files);
    const valid = incoming.filter((f) => ALLOWED_TYPES.includes(f.type));
    if (valid.length === 0) return;

    // Enforce max count
    const room = MAX_ATTACHMENTS - attachments.length;
    const toAdd = valid.slice(0, room);
    if (toAdd.length === 0) return;

    const newAttachments = await Promise.all(toAdd.map(fileToAttachment));

    // Enforce max total size
    let running = totalAttachmentBytes;
    const filtered = newAttachments.filter((a) => {
      running += a.size;
      return running <= MAX_TOTAL_BYTES;
    });

    if (filtered.length > 0) {
      setAttachments((prev) => [...prev, ...filtered]);
    }
  }, [attachments.length, totalAttachmentBytes]);

  const removeAttachment = useCallback((index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---- Paste handler (Ctrl+V images) ----
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === 'file' && ALLOWED_TYPES.includes(item.type)) {
        files.push(item.getAsFile());
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  }, [addFiles]);

  // ---- Drag & drop ----
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled || isSending) return;
    
    // Stop voice recognition if active
    if (isListening) stopListening();
    
    const currentAttachments = attachments.length > 0 ? [...attachments] : null;
    
    // Clear immediately before sending
    setMessage('');
    setAttachments([]);
    setIsSending(true);
    
    try {
      await onSend(trimmedMessage || 'Analyze the attached file(s)', currentAttachments);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore on error
      setMessage(trimmedMessage);
      if (currentAttachments) setAttachments(currentAttachments);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  const isDisabled = disabled || isSending;
  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isDisabled && !isProcessing;

  // ---- Compact mode (simplified single-line input) ----
  if (compact) {
    return (
      <div
        className="p-2 border-t"
        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-9 px-3 text-sm"
            style={{
              backgroundColor: 'var(--color-surface)',
              border:          '1px solid var(--color-border)',
              color:           'var(--color-text-primary)',
              fontFamily:      'var(--font-ui)',
              borderRadius:    '2px',
              outline:         'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-border-focus)'}
            onBlur={e  => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center transition-opacity"
            style={{
              backgroundColor: canSend ? 'var(--color-running)' : 'var(--color-border)',
              color:           'white',
              borderRadius:    '2px',
              cursor:          canSend ? 'pointer' : 'not-allowed',
              opacity:         canSend ? 1 : 0.4,
            }}
            title="Send (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ---- Full mode ----
  return (
    <div
      className="px-4 pb-4 pt-2 relative"
      style={{ backgroundColor: 'var(--color-bg)' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none rounded-2xl border-2 border-dashed"
          style={{ backgroundColor: 'rgba(59,130,246,0.06)', borderColor: 'var(--color-running)' }}
        >
          <div className="flex flex-col items-center gap-2" style={{ color: 'var(--color-running)' }}>
            <Paperclip className="w-6 h-6" />
            <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>drop files here</span>
          </div>
        </div>
      )}

      {/* Claude Desktop-style unified card */}
      <InputCard dragActive={dragActive}>
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 h-6 pl-2 pr-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border:          '1px solid rgba(255,255,255,0.1)',
                  borderRadius:    '6px',
                }}
              >
                {att.preview ? (
                  <img src={att.preview} alt="" className="w-4 h-4 object-cover flex-shrink-0 rounded" />
                ) : (
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                )}
                <span className="text-xs select-none whitespace-nowrap" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {truncateFilename(att.filename)}
                </span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="w-4 h-4 flex items-center justify-center transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-error)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  title="Remove"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isListening ? 'Listening...' : placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none text-sm leading-relaxed px-4 pt-3 pb-2"
          style={{
            backgroundColor: 'transparent',
            color:           'var(--color-text-primary)',
            minHeight:       '44px',
            maxHeight:       '200px',
            fontFamily:      'var(--font-ui)',
            fontStyle:       isListening ? 'italic' : 'normal',
            display:         'block',
            outline:         'none',
            border:          'none',
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          {/* Left — attach */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || isProcessing || attachments.length >= MAX_ATTACHMENTS}
              title={attachments.length >= MAX_ATTACHMENTS ? `Max ${MAX_ATTACHMENTS} files` : 'Attach image, PDF, or Word doc'}
            >
              <Paperclip className="w-4 h-4" />
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept={[...ALLOWED_TYPES, '.pdf', '.docx'].join(',')}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Right — stop / send / listening pill / mic */}
          {isProcessing ? (
            /* Stop button */
            <button
              onClick={handleCancel}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center transition-all hover:opacity-85"
              style={{ backgroundColor: 'var(--color-error)', color: 'white', borderRadius: '10px', cursor: 'pointer' }}
              title="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : isListening ? (
            /* Listening — blue pill with animated dots + mic icon (click to stop) */
            <button
              onClick={stopListening}
              className="flex-shrink-0 h-11 flex items-center justify-center gap-1.5 px-3 transition-all hover:opacity-85"
              style={{
                backgroundColor: 'var(--color-running)',
                color:           'white',
                borderRadius:    '10px',
                cursor:          'pointer',
              }}
              title="Stop listening"
            >
              <span className="flex items-center gap-[3px]">
                <span className="w-[5px] h-[5px] rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-[5px] h-[5px] rounded-full bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-[5px] h-[5px] rounded-full bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
              </span>
              <Mic className="w-4 h-4" />
            </button>
          ) : canSend ? (
            /* Send button — accent rounded square, arrow-up */
            <button
              onClick={handleSend}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center transition-all hover:opacity-85"
              style={{
                backgroundColor: 'var(--color-running)',
                color:           'white',
                borderRadius:    '10px',
                cursor:          'pointer',
              }}
              title="Send (Enter)"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              )}
            </button>
          ) : speechSupported ? (
            /* Mic — small toolbar icon when idle */
            <ToolbarButton
              onClick={toggleListening}
              disabled={isDisabled}
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </ToolbarButton>
          ) : null}
        </div>
      </InputCard>

      {/* Disclaimer — always visible, never changes */}
      <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
        ARKEN AI may make errors in engineering calculations. Always verify critical parameters.
      </p>
    </div>
  );
}
