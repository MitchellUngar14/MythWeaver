'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Send, Sparkles, Copy, Check,
  ChevronDown, Loader2, Trash2, Settings2, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

interface QuickPrompt {  label: string;  prompt: string;}interface AIAssistantProps {  worldId?: string;  context?: string;  quickPrompts?: QuickPrompt[];  title?: string;  placeholder?: string;  emptyStateText?: string;}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Describe scene', prompt: 'Describe the current scene with sensory details.' },
  { label: 'NPC dialogue', prompt: 'Generate dialogue for an NPC the party is interacting with.' },
  { label: 'What happens next?', prompt: 'Suggest what could happen next in the story.' },
  { label: 'Encounter advice', prompt: 'Give tactical advice for running this encounter.' },
];

export function AIAssistant({
  worldId,
  context,
  quickPrompts = DEFAULT_QUICK_PROMPTS,
  title = 'AI DM Assistant',
  placeholder = 'Ask the AI assistant...',
  emptyStateText = 'Ask me anything about running your game!',
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-model') || 'gemini-2.5-flash';
    }
    return 'gemini-2.5-flash';
  });
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/ai/dm-assist');
        const data = await res.json();
        if (data.models) {
          setModels(data.models);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    }
    fetchModels();
  }, []);

  // Save selected model to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-model', selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle /model command
  useEffect(() => {
    if (input.toLowerCase() === '/model' || input.toLowerCase() === '/models') {
      setShowModelPicker(true);
      setInput('');
    }
  }, [input]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/dm-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          worldId,
          context,
          model: selectedModel,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        // Check for rate limit error
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Rate limit exceeded. Please wait a moment and try again.');
        }
        // Check for JSON error response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to get response');
        }
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Check if we received a JSON error response instead of a stream
            if (assistantContent === '' && chunk.trim().startsWith('{')) {
              try {
                const errorData = JSON.parse(chunk);
                if (errorData.error) {
                  throw new Error(errorData.error);
                }
              } catch (parseErr) {
                // Not JSON or not an error, continue as normal stream
              }
            }

            assistantContent += chunk;

            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: assistantContent }
                  : m
              )
            );
          }
        } catch (streamError: any) {
          // Remove the empty assistant message and re-throw
          setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
          throw streamError;
        }
      }
    } catch (error: any) {
      console.error('AI request failed:', error);
      const errorMessage = error?.message || 'Sorry, I encountered an error. Please try again.';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ ${errorMessage}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMessage(content: string, index: number) {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleQuickPrompt(prompt: string) {
    setInput(prompt);
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
          }
        `}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <Sparkles className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearChat}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* Model selector row */}
            <button
              onClick={() => setShowModelPicker(true)}
              className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors"
            >
              <Cpu className="w-3 h-3" />
              <span>{models.find(m => m.id === selectedModel)?.name || selectedModel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>


          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {emptyStateText}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickPrompts.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(qp.prompt)}
                      className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-2
                      ${msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }
                    `}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-strong:text-inherit prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-code:bg-gray-200 dark:prose-code:bg-gray-600 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => copyMessage(msg.content, index)}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Model Picker Modal */}
      {showModelPicker && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Select AI Model</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowModelPicker(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelPicker(false);
                    setMessages(prev => [...prev, {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: `Switched to **${model.name}** (${model.provider})`,
                    }]);
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedModel === model.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      model.provider === 'openai' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </span>
                    {selectedModel === model.id && (
                      <Check className="w-4 h-4 text-purple-600 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-4">
                    {model.provider === 'openai' ? 'OpenAI' : 'Google'} • {model.description}
                  </p>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                Tip: Type <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/model</code> to open this
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
