import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSiteTheme = () => {
  const [theme, setTheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('site_theme')
          .select('*')
          .eq('is_active', true)
          .single();

        setTheme(data);
      } catch (error) {
        console.error('Error fetching theme:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();

    const channel = supabase
      .channel('theme-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_theme',
        },
        fetchTheme
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { theme, loading };
};
