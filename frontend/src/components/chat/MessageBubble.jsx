/**
 * MessageBubble — Claude Desktop-style chat messages.
 *
 * User:      right-aligned pill, subtle translucent background, 16px radius
 * Assistant: no background — text sits directly on the page, full width
 * Actions:   copy + retry, appear on hover
 */

import { useState, useRef, useEffect } from 'react';
import { Copy, Check, AlertCircle, XCircle, Loader2, FileText, RotateCcw, Pencil } from 'lucide-react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';
import ImageLightbox from '../modals/ImageLightbox';
import { resolveImageSrc } from '../../utils/imageSource';

function MessageStatusIndicator({ status }) {
  if (!status || status === 'complete') return null;

  const config = {
    streaming: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      text: 'Response may be incomplete',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      text: 'Response was interrupted',
    },
    cancelled: {
      icon: <XCircle className="w-4 h-4" />,
      text: 'Response was cancelled',
    },
  }[status];

  if (!config) return null;

  return (
    <div
      className="flex items-center gap-2 text-xs px-3 py-1.5 mt-2"
      style={{
        color:           'var(--color-warning)',
        backgroundColor: 'rgba(234,179,8,0.08)',
        border:          '1px solid rgba(234,179,8,0.2)',
        borderRadius:    '6px',
      }}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

function ActionButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 transition-colors"
      style={{ borderRadius: '6px', color: 'var(--color-text-muted)' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {children}
    </button>
  );
}

export default function MessageBubble({ message, onRetry, onEdit, messageIndex, isLastAssistant = false, isLastUser = false, isProcessing = false, editingMessageIndex = null }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const editTextareaRef = useRef(null);

  const isUser = message.role === 'user';
  const status = message.cancelled ? 'cancelled' : (message.status || 'complete');

  // Auto-focus and auto-resize textarea when entering edit mode
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      const ta = editTextareaRef.current;
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      // Place cursor at the end
      ta.selectionStart = ta.selectionEnd = ta.value.length;
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditText(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) {
      handleCancelEdit();
      return;
    }
    if (onEdit && messageIndex !== undefined) {
      onEdit(messageIndex, trimmed);
    }
    setIsEditing(false);
    setEditText('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // ── User message ──────────────────────────────────────────────────────────
  if (isUser) {
    const userAttachments = message.attachments || message.metadata?.attachments || [];
    const hasAttachments = userAttachments.length > 0;
    const hasText = message.content && message.content.trim();

    return (
      <div className="flex justify-end mb-6 group">
        <div style={{ maxWidth: isEditing ? '90%' : '75%', minWidth: isEditing ? '300px' : undefined, transition: 'max-width 0.2s ease' }}>
          {/* Bubble */}
          <div
            className={`${isEditing ? '' : 'overflow-hidden'} ${!hasText && hasAttachments ? 'p-1.5' : ''}`}
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius:    isEditing ? '12px' : '16px 16px 4px 16px',
              color:           'var(--color-text-primary)',
              border:          isEditing ? '1px solid rgba(255,255,255,0.15)' : undefined,
            }}
          >
            {/* Attachments */}
            {hasAttachments && (
              <div className={`flex flex-wrap gap-1.5 ${hasText ? 'p-1.5 pb-0' : ''}`}>
                {userAttachments.map((att, idx) => {
                  const isPdf  = att.media_type === 'application/pdf';
                  const isDocx = att.media_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  const hasImageData = !isPdf && !isDocx && (att.preview || att.data);

                  if (isPdf || isDocx) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 text-sm truncate"
                        style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', maxWidth: '200px' }}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="truncate">{att.filename || (isPdf ? 'Document.pdf' : 'Document.docx')}</span>
                      </div>
                    );
                  }

                  if (hasImageData) {
                    const imgSrc = resolveImageSrc(att);
                    return (
                      <img
                        key={idx}
                        src={imgSrc}
                        alt={att.filename || 'attachment'}
                        className="max-w-[240px] max-h-[180px] min-w-[100px] object-cover hover:opacity-90 transition-opacity"
                        style={{ borderRadius: '8px', cursor: imgSrc ? 'pointer' : 'default' }}
                        onClick={imgSrc ? () => setLightboxImage({ src: imgSrc, alt: att.filename || 'attachment' }) : undefined}
                      />
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs truncate"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', maxWidth: '140px' }}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{att.filename || 'File attached'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Text or Edit textarea */}
            {isEditing ? (
              <div className="px-4 py-3">
                <textarea
                  ref={editTextareaRef}
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-transparent text-sm leading-relaxed resize-none outline-none focus:ring-1 focus:ring-offset-1 rounded"
                  style={{
                    color: 'var(--color-text-primary)',
                    minHeight: '3rem',
                    overflow: 'hidden',
                    '--tw-ring-color': 'rgba(255,255,255,0.2)',
                    '--tw-ring-offset-color': 'rgba(0,0,0,0)',
                  }}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-2 text-xs rounded-md transition-colors"
                    style={{
                      color: 'var(--color-text-muted)',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-2 text-xs rounded-md transition-colors font-medium"
                    style={{
                      color: 'var(--color-text-primary)',
                      backgroundColor: 'rgba(255,255,255,0.12)',
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : hasText ? (
              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
              </div>
            ) : null}
          </div>

          {/* Action row — hidden during edit mode */}
          {!isEditing && (
            <div className="flex justify-end items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ActionButton onClick={handleCopy} title="Copy message">
                {copied
                  ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-approved)' }} />
                  : <Copy className="w-3.5 h-3.5" />
                }
              </ActionButton>
              {onEdit && editingMessageIndex !== messageIndex && (
                <ActionButton onClick={handleStartEdit} title="Edit message">
                  <Pencil className="w-3.5 h-3.5" />
                </ActionButton>
              )}
              {isLastUser && onRetry && (
                <ActionButton onClick={onRetry} title="Resend this message">
                  <RotateCcw className="w-3.5 h-3.5" />
                </ActionButton>
              )}
            </div>
          )}

          {/* Image lightbox overlay */}
          {lightboxImage && (
            <ImageLightbox
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              onClose={() => setLightboxImage(null)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Assistant message — no background, text on page ───────────────────────
  return (
    <div className="mb-6 group w-full">
      <div className="w-full">
        {/* Content — no background box */}
        <div
          className={`relative ${status === 'error' ? 'pl-3' : ''}`}
          style={status === 'error' ? { borderLeft: '2px solid var(--color-error)' } : undefined}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert" style={{ lineHeight: '1.7' }}>
            <MarkdownRenderer content={message.content} />
          </div>
          <MessageStatusIndicator status={status} />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton onClick={handleCopy} title="Copy message">
            {copied
              ? <Check className="w-4 h-4" style={{ color: 'var(--color-approved)' }} />
              : <Copy className="w-4 h-4" />
            }
          </ActionButton>
          {isLastAssistant && onRetry && (
            <ActionButton onClick={onRetry} title="Retry this response">
              <RotateCcw className="w-4 h-4" />
            </ActionButton>
          )}
        </div>

        {/* Tool call count */}
        {message.metadata?.tool_calls?.length > 0 && (
          <div className="mt-1">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {message.metadata.tool_calls.length} tool{message.metadata.tool_calls.length > 1 ? 's' : ''} used
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
