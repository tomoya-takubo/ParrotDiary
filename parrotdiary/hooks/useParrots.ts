// hooks/useParrots.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useParrots = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [parrots, setParrots] = useState<any[]>([]);

  useEffect(() => {
    const fetchParrots = async () => {
      try {
        const { data, error } = await supabase
          .from('parrots')
          .select('*');

        if (error) throw error;
        setParrots(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchParrots();
  }, []);

  return { parrots, loading, error };
};