'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Send, Sparkles, Copy, Check,
  ChevronDown, ChevronUp, Loader2, Trash2, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import type { Character, CharacterStats, Ability } from '@/lib/schema';
import type { CombatantState } from '@/stores/sessionStore';

interface ParticipantWithCharacter {
  id: string;
  userName: string;
  character: Character | null;
}

interface SessionDMAssistantProps {
  worldId: string;
  worldName: string;
  sessionId: string;
  sessionName: string;
  participants: ParticipantWithCharacter[];
  combatants: CombatantState[];
  combatActive: boolean;
  round: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SESSION_QUICK_PROMPTS = [
  { label: 'Spell lookup', prompt: 'I need to look up a spell. What spell would you like details on?' },
  { label: 'Rules check', prompt: 'I have a D&D 5e rules question.' },
  { label: 'Describe scene', prompt: 'Describe the current scene with rich sensory details for the party.' },
  { label: 'NPC reaction', prompt: 'How would the NPC react to what just happened?' },
  { label: 'Combat idea', prompt: 'Suggest an interesting tactical action for the current encounter.' },
];

export function SessionDMAssistant({
  worldId,
  worldName,
  sessionName,
  participants,
  combatants,
  combatActive,
  round,
}: SessionDMAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [includedParticipants, setIncludedParticipants] = useState<Set<string>>(() =>
    new Set(participants.filter(p => p.character).map(p => p.id))
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update included participants when participants change
  useEffect(() => {
    setIncludedParticipants(prev => {
      const newSet = new Set(prev);
      // Add any new participants with characters
      participants.forEach(p => {
        if (p.character && !prev.has(p.id)) {
          newSet.add(p.id);
        }
      });
      // Remove any participants that no longer exist
      prev.forEach(id => {
        if (!participants.find(p => p.id === id)) {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  }, [participants]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildContext(): string {
    const included = participants.filter(
      p => includedParticipants.has(p.id) && p.character
    );

    let context = `SESSION: ${sessionName}\nWORLD: ${worldName}\n`;

    // Add combat state if active
    if (combatActive && combatants.length > 0) {
      context += `\nCOMBAT ACTIVE - Round ${round}\n`;
      context += `Initiative Order:\n`;
      const sortedCombatants = [...combatants].sort((a, b) => b.position - a.position);
      sortedCombatants.forEach((c, i) => {
        context += `${i + 1}. ${c.name} (${c.type === 'enemy' ? 'Enemy' : 'Player'}) - HP: ${c.currentHp}/${c.maxHp}, AC: ${c.ac}`;
        if (c.statusEffects && c.statusEffects.length > 0) {
          context += ` [${c.statusEffects.map(s => s.name).join(', ')}]`;
        }
        context += '\n';
      });
    }

    // Add party information
    if (included.length > 0) {
      context += `\nPARTY (${included.length} player${included.length !== 1 ? 's' : ''}):\n`;
      included.forEach(p => {
        const char = p.character!;
        const stats = char.stats as CharacterStats;
        context += `\n--- ${char.name} (played by ${p.userName}) ---\n`;
        context += `Level ${char.level} ${char.race || ''} ${char.class || ''}\n`;
        context += `HP: ${stats.hp}/${stats.maxHp} | AC: ${stats.ac} | Speed: ${stats.speed}ft\n`;
        context += `STR: ${stats.str} | DEX: ${stats.dex} | CON: ${stats.con} | INT: ${stats.int} | WIS: ${stats.wis} | CHA: ${stats.cha}\n`;
        context += `Proficiency Bonus: +${stats.proficiencyBonus} | Hit Dice: ${stats.hitDice}\n`;

        const abilities = char.abilities as Ability[] | undefined;
        if (abilities && abilities.length > 0) {
          context += `Abilities: ${abilities.map(a => a.name).join(', ')}\n`;
        }
      });
    }

    return context;
  }

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
      const context = buildContext();
      const response = await fetch('/api/ai/dm-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          worldId,
          context,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: assistantContent }
                : m
            )
          );
        }
      }
    } catch (error) {
      console.error('AI request failed:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
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

  function toggleParticipant(participantId: string) {
    setIncludedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  }

  const participantsWithCharacters = participants.filter(p => p.character);
  const includedCount = participantsWithCharacters.filter(p => includedParticipants.has(p.id)).length;

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
        title="DM Assistant"
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
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">DM Assistant</h3>
              {participantsWithCharacters.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {includedCount} player{includedCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChat} title="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} title="Close">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Player Context Panel */}
          {participantsWithCharacters.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Player Context</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {includedCount}/{participantsWithCharacters.length} included
                  </span>
                  {isContextExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>
              {isContextExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {participantsWithCharacters.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={includedParticipants.has(p.id)}
                        onChange={() => toggleParticipant(p.id)}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {p.character!.name}
                      </span>
                      <span className="text-gray-500 dark:text-gray-500 text-xs">
                        ({p.userName})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Combat Status Badge */}
          {combatActive && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Combat Active - Round {round}</span>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Your D&D 5e assistant
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                  Ask about spells, rules, or get creative ideas!
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SESSION_QUICK_PROMPTS.map((qp, i) => (
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
                placeholder="Ask about spells, rules, or ideas..."
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
    </>
  );
}
