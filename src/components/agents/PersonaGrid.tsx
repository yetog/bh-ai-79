import React from 'react';
import { Brain } from 'lucide-react';
import PersonaCard, { Persona, PERSONAS } from './PersonaCard';

interface PersonaGridProps {
  onSelect: (persona: Persona) => void;
}

const PersonaGrid: React.FC<PersonaGridProps> = ({ onSelect }) => (
  <div className="min-h-screen bg-gradient-cosmic">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12 space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Brain className="w-10 h-10 text-primary cosmic-glow" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Your Agents
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Each agent is trained on your real conversations. Pick one and start chatting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PERSONAS.map((persona) => (
          <PersonaCard key={persona.slug} persona={persona} onClick={onSelect} />
        ))}
      </div>
    </div>
  </div>
);

export default PersonaGrid;
