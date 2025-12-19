'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import type { ChatMessage } from '@/stores/sessionStore';

interface SessionChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
}

export function SessionChat({ messages, currentUserId, onSendMessage }: SessionChatProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } finally {
      setIsSending(false);
    }
  }

  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Get latest message for collapsed preview
  const latestMessage = messages[messages.length - 1];
  const collapsedContent = latestMessage
    ? `${latestMessage.userName}: ${latestMessage.content.slice(0, 30)}${latestMessage.content.length > 30 ? '...' : ''}`
    : undefined;

  return (
    <CollapsibleCard
      title="Chat"
      icon={<MessageCircle className="w-5 h-5" />}
      badge={messages.length > 0 ? messages.length : undefined}
      collapsedContent={collapsedContent}
    >
      {/* Messages */}
      <div className="h-48 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">
            No messages yet
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.oduserId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwn
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium opacity-75 mb-0.5">
                      {msg.userName}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isSending}
        />
        <Button type="submit" size="sm" isLoading={isSending} disabled={!message.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </CollapsibleCard>
  );
}
