import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import type { User } from '@/types/user';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        set({ session, user: mapUser(session.user) });
      }
    } catch (error) {
      console.warn('Error getting session:', error);
    } finally {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange((event, session) => {
      // Only log out on explicit sign out
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null });
      } else if (session) {
        set({ session, user: mapUser(session.user) });
      }
    });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session, user: mapUser(data.user) });
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

function mapUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name: supabaseUser.user_metadata?.full_name ?? 'User',
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
    currency: supabaseUser.user_metadata?.currency ?? 'PHP',
    createdAt: supabaseUser.created_at,
  };
}
