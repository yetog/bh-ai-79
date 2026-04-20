import React, { useState } from 'react';
import PersonaGrid from '@/components/agents/PersonaGrid';
import PersonaChat from '@/components/agents/PersonaChat';
import { Persona } from '@/components/agents/PersonaCard';

const AgentsPage: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  if (selectedPersona) {
    return (
      <PersonaChat
        persona={selectedPersona}
        onBack={() => setSelectedPersona(null)}
      />
    );
  }

  return <PersonaGrid onSelect={setSelectedPersona} />;
};

export default AgentsPage;
