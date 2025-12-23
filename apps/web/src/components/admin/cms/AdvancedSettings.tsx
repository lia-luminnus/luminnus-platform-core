import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings } from 'lucide-react';

export const AdvancedSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>⚙️ Configurações Avançadas</CardTitle>
          <CardDescription>
            Configurações técnicas e avançadas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              As configurações avançadas (manutenção, cache, etc.) serão migradas para esta aba em breve.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
