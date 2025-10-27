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
    
    // First, clear local state immediately
    setUser(null);
    setSession(null);
    setLoading(true);
    console.log('Local state cleared');
    
    try {
      console.log('Calling supabase.auth.signOut()');
      const { error } = await supabase.auth.signOut();
      
      // Ignore 403 errors - session may already be invalid on server
      if (error && error.message !== 'Session from session_id claim in JWT does not exist') {
        console.error('Supabase signOut error (non-403):', error);
      }
      
      console.log('Supabase signOut complete');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Force clear all auth data from localStorage
      console.log('Force clearing localStorage...');
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      setUser(null);
      setSession(null);
      setLoading(false);
      console.log('=== SIGNOUT COMPLETE ===');
    }
  };

  return { user, session, loading, signOut };
};
