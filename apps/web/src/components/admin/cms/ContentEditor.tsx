import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionEditor } from './SectionEditor';

const sections = [
  { key: 'hero', label: 'Hero', icon: '🏠' },
  { key: 'plans', label: 'Planos', icon: '💳' },
  { key: 'about', label: 'Sobre', icon: 'ℹ️' },
  { key: 'solutions', label: 'Soluções', icon: '⚡' },
  { key: 'footer', label: 'Rodapé', icon: '📄' },
];

export const ContentEditor = () => {
  const [selectedSection, setSelectedSection] = useState('hero');

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar: Lista de Seções */}
      <div className="col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seções do Site</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {sections.map((section) => (
                  <Button
                    key={section.key}
                    variant={selectedSection === section.key ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedSection(section.key)}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Editor Principal */}
      <div className="col-span-9">
        <SectionEditor sectionKey={selectedSection} />
      </div>
    </div>
  );
};
