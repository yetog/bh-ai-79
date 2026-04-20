import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Persona {
  slug: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

export const PERSONAS: Persona[] = [
  { slug: 'software-developer',       name: 'Software Developer',       description: 'Code, architecture, debugging, best practices',     icon: '💻', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { slug: 'data-scientist',           name: 'Data Scientist',           description: 'ML, analytics, statistics, Python, data pipelines', icon: '📊', gradient: 'from-purple-500/20 to-pink-500/20' },
  { slug: 'professional-salesperson', name: 'Professional Salesperson', description: 'Sales strategy, objection handling, qualification',  icon: '🤝', gradient: 'from-green-500/20 to-emerald-500/20' },
  { slug: 'marketing-expert',         name: 'Marketing Expert',         description: 'Campaigns, copywriting, brand, growth tactics',     icon: '📣', gradient: 'from-orange-500/20 to-yellow-500/20' },
  { slug: 'language-tutor',           name: 'Language Tutor',           description: 'Grammar, vocabulary, writing, language learning',   icon: '🌍', gradient: 'from-teal-500/20 to-blue-500/20' },
  { slug: 'life-hacker',              name: 'Life Hacker',              description: 'Productivity, habits, tools, efficiency hacks',     icon: '⚡', gradient: 'from-yellow-500/20 to-orange-500/20' },
  { slug: 'mindfulness-coach',        name: 'Mindfulness Coach',        description: 'Meditation, stress, focus, mental wellness',        icon: '🧘', gradient: 'from-violet-500/20 to-purple-500/20' },
  { slug: 'general',                  name: 'General Assistant',        description: 'All-purpose help across any topic',                 icon: '🌟', gradient: 'from-slate-500/20 to-gray-500/20' },
];

interface PersonaCardProps {
  persona: Persona;
  onClick: (persona: Persona) => void;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, onClick }) => (
  <Card
    onClick={() => onClick(persona)}
    className={cn(
      'cursor-pointer border border-border bg-gradient-void hover:cosmic-glow cosmic-transition group',
      'hover:border-primary/50 hover:scale-[1.02]'
    )}
  >
    <CardContent className={cn('p-6 bg-gradient-to-br rounded-lg h-full', persona.gradient)}>
      <div className="text-4xl mb-4">{persona.icon}</div>
      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary cosmic-transition mb-2">
        {persona.name}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{persona.description}</p>
    </CardContent>
  </Card>
);

export default PersonaCard;
