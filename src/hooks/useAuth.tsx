import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.log('=== SIGNOUT FUNCTION CALLED ===');
    console.log('Current user before signout:', user?.email);
    try {
      // First, clear local state immediately
      setUser(null);
      setSession(null);
      setLoading(true);
      console.log('Local state cleared, calling supabase.auth.signOut()');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      console.log('Supabase signOut successful');
    } catch (error) {
      console.error('Error signing out:', error);
      // Keep state cleared even if signOut fails
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
      console.log('=== SIGNOUT COMPLETE ===');
    }
  };

  return { user, session, loading, signOut };
};
