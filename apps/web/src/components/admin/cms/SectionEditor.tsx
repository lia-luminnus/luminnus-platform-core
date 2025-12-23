import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SectionEditorProps {
  sectionKey: string;
}

export const SectionEditor = ({ sectionKey }: SectionEditorProps) => {
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('site_content')
          .select('*')
          .eq('section_key', sectionKey)
          .single();

        if (data) {
          setContent(data.content || {});
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [sectionKey]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('site_content')
        .update({ 
          content,
          updated_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('section_key', sectionKey);

      if (error) throw error;

      toast.success('Conteúdo salvo com sucesso!');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Erro ao salvar conteúdo');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setContent((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor de Conteúdo: {sectionKey.toUpperCase()}</CardTitle>
        <CardDescription>Edite o conteúdo desta seção do site</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.keys(content).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Label>
              {typeof content[key] === 'string' && content[key].length > 100 ? (
                <Textarea
                  id={key}
                  value={content[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={4}
                />
              ) : (
                <Input
                  id={key}
                  value={content[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                '💾 Salvar Alterações'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
