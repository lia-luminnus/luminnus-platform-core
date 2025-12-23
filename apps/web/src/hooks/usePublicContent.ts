import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePublicContent = (sectionKey: string) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('site_content')
          .select('content')
          .eq('section_key', sectionKey)
          .eq('is_active', true)
          .single();

        if (fetchError) throw fetchError;
        setContent(data?.content);
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching content:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();

    // Realtime subscription
    const channel = supabase
      .channel(`content:${sectionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: `section_key=eq.${sectionKey}`,
        },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sectionKey]);

  return { content, loading, error };
};
