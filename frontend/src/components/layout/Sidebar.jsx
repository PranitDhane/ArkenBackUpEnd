/**
 * Sidebar Component
 * 
 * Displays conversation list and navigation controls.
 * Features:
 * - New Chat button
 * - Scrollable conversation list
 * - Active conversation highlighting with left border
 * - Delete conversation with confirmation
 */

import { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { formatRelativeTime, truncate } from '../../utils/formatters';
import { Plus, MessageSquare, Trash2, Loader2, X } from 'lucide-react';

export default function Sidebar({ onClose }) {
  const {
    conversationId,
    setConversationId,
    conversations,
    conversationsLoading,
    deleteConversation,
    createNewConversation,
  } = useChatContext();

  const [deletingId, setDeletingId] = useState(null);

  /**
   * Handle new chat button click
   */
  const handleNewChat = () => {
    createNewConversation();
    onClose?.();
  };

  /**
   * Handle conversation click
   */
  const handleConversationClick = (convId) => {
    setConversationId(convId);
    onClose?.();
  };

  /**
   * Handle delete conversation
   */
  const handleDelete = async (e, convId) => {
    e.stopPropagation();
    
    if (!window.confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(convId);
    await deleteConversation(convId);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Conversations</h2>
          
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                     bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                     font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <MessageSquare className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="py-2">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.conversation_id}
                conversation={conv}
                isActive={conv.conversation_id === conversationId}
                isDeleting={conv.conversation_id === deletingId}
                onClick={() => handleConversationClick(conv.conversation_id)}
                onDelete={(e) => handleDelete(e, conv.conversation_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          ARKEN AI Chat Interface
        </p>
      </div>
    </div>
  );
}

/**
 * Individual conversation item
 */
function ConversationItem({ conversation, isActive, isDeleting, onClick, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`
        group px-3 py-2.5 mx-2 cursor-pointer transition-all duration-200 rounded-lg
        ${isActive 
          ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' 
          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          mt-0.5 p-1.5 rounded-lg transition-colors
          ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
        `}>
          <MessageSquare size={14} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`
            text-sm font-medium truncate
            ${isActive ? 'text-blue-900' : 'text-gray-900'}
          `}>
            {truncate(conversation.title, 30) || 'Untitled Chat'}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1">
            {/* Simulation badge */}
            {conversation.has_simulations && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 
                             text-xs font-medium border border-green-300 text-green-600 bg-green-50 rounded-full">
                ✓ Simulated
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        {(showDelete || isDeleting) && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-500 
                     hover:bg-red-50 rounded-lg transition-colors"
          >
            {isDeleting ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
