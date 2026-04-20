import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Persona } from './PersonaCard';
import { agentChat, ConversationTurn, AgentCitation } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: AgentCitation[];
}

interface PersonaChatProps {
  persona: Persona;
  onBack: () => void;
}

const CitationChip: React.FC<{ citation: AgentCitation; index: number }> = ({ citation, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block mr-2 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/30 cosmic-transition"
      >
        [{index + 1}] {citation.filename.split('/').pop()?.split('\\').pop()}
      </button>
      {open && (
        <div className="mt-1 p-2 bg-muted/80 border border-border rounded text-xs text-muted-foreground max-w-xs">
          <div className="font-medium mb-1">Score: {(citation.score * 100).toFixed(0)}%</div>
          {citation.chunk_text}
        </div>
      )}
    </div>
  );
};

const PersonaChat: React.FC<PersonaChatProps> = ({ persona, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm your ${persona.name} agent, trained on real conversations. Ask me anything.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    const history: ConversationTurn[] = messages
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await agentChat(persona.slug, text, history);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.answer,
        citations: resp.citations,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-cosmic">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-2xl">{persona.icon}</span>
        <div>
          <div className="font-semibold text-foreground">{persona.name}</div>
          <div className="text-xs text-muted-foreground">{persona.description}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted/60 text-foreground border border-border rounded-bl-sm'
            )}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  {msg.citations.map((c, ci) => (
                    <CitationChip key={ci} citation={c} index={ci} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/60 border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 backdrop-blur-sm">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask your ${persona.name}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="rounded-xl h-10 w-10">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default PersonaChat;
