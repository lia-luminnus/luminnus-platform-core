import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const MediaLibrary = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📤 Biblioteca de Mídia</CardTitle>
          <CardDescription>
            Gerencie imagens e arquivos do site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              A biblioteca de mídia com upload de imagens será implementada em breve.
              Por enquanto, você pode gerenciar imagens através do código.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
