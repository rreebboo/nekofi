import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { signInWithFacebook as fbSignIn } from '@/services/auth/facebookAuth';
import { signInWithGoogle as googleSignIn, signOutFromGoogle } from '@/services/auth/googleAuth';
import type { User } from '@/types/user';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  syncConflict: boolean;
  isCheckingConflict: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  /**
   * Sign in (or auto-create) a user via Facebook OAuth.
   * Throws a user-friendly string message on failure.
   */
  signInWithFacebook: () => Promise<void>;
  /**
   * Sign in (or auto-create) a user via Google native sign-in.
   * Shows the native OS Google account picker — no browser opens.
   * Throws a user-friendly string message on failure.
   */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  setSyncConflict: (value: boolean) => void;
  setIsCheckingConflict: (value: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      isGuest: false,
      syncConflict: false,
      isCheckingConflict: false,

      initialize: async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session) {
            set({ session, user: mapUser(session.user), isGuest: false });
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
            set({ session, user: mapUser(session.user), isGuest: false });
          }
        });
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        set({ session: data.session, user: mapUser(data.user), isGuest: false });
      },

      signUp: async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
      },

      signInWithFacebook: async () => {
        const result = await fbSignIn();
        if (!result.success) {
          // Bubble up a clean error message for the UI to display
          throw new Error(result.error.message);
        }
        set({
          session: result.session,
          user: mapUser(result.user),
          isGuest: false,
        });
      },

      signInWithGoogle: async () => {
        const result = await googleSignIn();
        if (!result.success) {
          // Bubble up a clean error message for the UI to display
          throw new Error(result.error.message);
        }
        set({
          session: result.session,
          user: mapUser(result.user),
          isGuest: false,
        });
      },

      signOut: async () => {
        await supabase.auth.signOut();
        // Clear the native Google Sign-In state so the next sign-in shows
        // the account picker instead of silently re-signing in.
        await signOutFromGoogle();
        set({ session: null, user: null, isGuest: true });
        
        // Import dynamically or at top to avoid cycles, but since we are in a store, 
        // we can just import the state directly.
        const { useAccountStore } = require('./accountStore');
        const { useBudgetStore } = require('./budgetStore');
        const { useTransactionStore } = require('./transactionStore');
        
        useAccountStore.getState().clearAccounts();
        useBudgetStore.getState().clearBudgets();
        useTransactionStore.getState().clearTransactions();
      },

      continueAsGuest: () => {
        set({ isGuest: true });
      },

      setSyncConflict: (value: boolean) => {
        set({ syncConflict: value });
      },

      setIsCheckingConflict: (value: boolean) => {
        set({ isCheckingConflict: value });
      },
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isGuest: state.isGuest, syncConflict: state.syncConflict }),
    }
  )
);

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
