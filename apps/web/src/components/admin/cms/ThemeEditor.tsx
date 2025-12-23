import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const ThemeEditor = () => {
  const [theme, setTheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('site_theme')
        .select('*')
        .eq('is_active', true)
        .single();

      if (data) {
        setTheme(data);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!theme) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('site_theme')
        .update({
          colors: theme.colors,
          fonts: theme.fonts,
          spacing: theme.spacing,
        })
        .eq('id', theme.id);

      if (error) throw error;

      toast.success('Tema salvo com sucesso!');
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Erro ao salvar tema');
    } finally {
      setSaving(false);
    }
  };

  const updateColor = (colorKey: string, value: string) => {
    setTheme((prev: any) => ({
      ...prev,
      colors: { ...prev.colors, [colorKey]: value },
    }));
  };

  if (loading || !theme) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const colors = theme.colors || {};

  return (
    <div className="space-y-6">
      {/* Paleta de Cores */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 Paleta de Cores</CardTitle>
          <CardDescription>Configure as cores do tema (HSL format)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(colors).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="capitalize">
                  {key}
                </Label>
                <div className="flex gap-2">
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: `hsl(${value})` }}
                  />
                  <Input
                    id={key}
                    value={value as string}
                    onChange={(e) => updateColor(key, e.target.value)}
                    placeholder="262.1 83.3% 57.8%"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tipografia */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Tipografia</CardTitle>
          <CardDescription>Configure as fontes do site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Fonte Principal</Label>
              <Input
                value={theme.fonts?.main || 'Inter'}
                onChange={(e) =>
                  setTheme((prev: any) => ({
                    ...prev,
                    fonts: { ...prev.fonts, main: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Fonte de Títulos</Label>
              <Input
                value={theme.fonts?.heading || 'Inter'}
                onChange={(e) =>
                  setTheme((prev: any) => ({
                    ...prev,
                    fonts: { ...prev.fonts, heading: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Espaçamento */}
      <Card>
        <CardHeader>
          <CardTitle>📏 Espaçamento</CardTitle>
          <CardDescription>Configure os espaçamentos e bordas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Border Radius (px)</Label>
              <Input
                value={theme.spacing?.borderRadius || '12px'}
                onChange={(e) =>
                  setTheme((prev: any) => ({
                    ...prev,
                    spacing: { ...prev.spacing, borderRadius: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            '💾 Salvar Tema'
          )}
        </Button>
      </div>
    </div>
  );
};
