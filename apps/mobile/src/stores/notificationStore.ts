import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/services/supabase/client';
import { Notification, NotificationType } from '@/types/notification';

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (title: string, body: string, type: NotificationType, metadata?: Record<string, any>) => Promise<Notification>;
  setNotifications: (notifications: Notification[]) => void;
  clearNotifications: () => void;
  handleRealtimeChange: (payload: any) => void;
}

export const mapToCamelNotification = (item: any): Notification => ({
  id: item.id,
  userId: item.user_id,
  title: item.title,
  body: item.body,
  type: item.type as NotificationType,
  metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {}),
  isRead: item.is_read,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  syncStatus: 'synced',
});

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter(n => !n.isRead).length;
        set({ notifications, unreadCount });
      },

      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

      fetchNotifications: async () => {
        const { useAuthStore } = require('@/stores/authStore');
        const authState = useAuthStore.getState();
        if (authState.syncConflict || authState.isGuest) return;

        set({ loading: true, error: null });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data, error } = await supabase
              .from('notifications')
              .select('*')
              .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
              const fetched = data.map(mapToCamelNotification);
              const unreadCount = fetched.filter(n => !n.isRead).length;
              set({ notifications: fetched, unreadCount });
            }
          }
        } catch (err: any) {
          console.warn('Error fetching notifications:', err.message);
          set({ error: err.message });
        } finally {
          set({ loading: false });
        }
      },

      markAsRead: async (id) => {
        const { useAuthStore } = require('@/stores/authStore');
        const authState = useAuthStore.getState();

        // Update locally first
        const updated = get().notifications.map(n => 
          n.id === id ? { ...n, isRead: true, updatedAt: new Date().toISOString() } : n
        );
        const unreadCount = updated.filter(n => !n.isRead).length;
        set({ notifications: updated, unreadCount });

        if (!authState.isGuest) {
          try {
            await supabase
              .from('notifications')
              .update({ is_read: true, updated_at: new Date().toISOString() })
              .eq('id', id);
          } catch (err) {
            console.error('Failed to sync markAsRead to Supabase:', err);
          }
        }
      },

      markAllAsRead: async () => {
        const { useAuthStore } = require('@/stores/authStore');
        const authState = useAuthStore.getState();

        // Update locally first
        const updated = get().notifications.map(n => ({
          ...n,
          isRead: true,
          updatedAt: new Date().toISOString(),
        }));
        set({ notifications: updated, unreadCount: 0 });

        if (!authState.isGuest && authState.user) {
          try {
            await supabase
              .from('notifications')
              .update({ is_read: true, updated_at: new Date().toISOString() })
              .eq('user_id', authState.user.id)
              .eq('is_read', false);
          } catch (err) {
            console.error('Failed to sync markAllAsRead to Supabase:', err);
          }
        }
      },

      deleteNotification: async (id) => {
        const { useAuthStore } = require('@/stores/authStore');
        const authState = useAuthStore.getState();

        // Update locally first
        const updated = get().notifications.filter(n => n.id !== id);
        const unreadCount = updated.filter(n => !n.isRead).length;
        set({ notifications: updated, unreadCount });

        if (!authState.isGuest) {
          try {
            await supabase
              .from('notifications')
              .delete()
              .eq('id', id);
          } catch (err) {
            console.error('Failed to sync delete to Supabase:', err);
          }
        }
      },

      addNotification: async (title, body, type, metadata = {}) => {
        const { useAuthStore } = require('@/stores/authStore');
        const authState = useAuthStore.getState();
        const userId = authState.user?.id || 'guest';

        const newNotification: Notification = {
          id: uuidv4(),
          userId,
          title,
          body,
          type,
          metadata,
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: authState.isGuest ? 'synced' : 'pending_insert',
        };

        // Add locally
        const updated = [newNotification, ...get().notifications];
        const unreadCount = updated.filter(n => !n.isRead).length;
        set({ notifications: updated, unreadCount });

        if (!authState.isGuest) {
          try {
            const { error } = await supabase.from('notifications').insert({
              id: newNotification.id,
              user_id: userId,
              title,
              body,
              type,
              metadata,
              is_read: false,
            });

            if (!error) {
              set((state) => ({
                notifications: state.notifications.map(n => 
                  n.id === newNotification.id ? { ...n, syncStatus: 'synced' } : n
                )
              }));
            } else {
              console.error('Failed to insert notification in Supabase:', error);
            }
          } catch (err) {
            console.error('Failed to insert notification in Supabase (network exception):', err);
          }
        }

        return newNotification;
      },

      handleRealtimeChange: (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        let notifications = [...get().notifications];

        if (eventType === 'DELETE') {
          notifications = notifications.filter(n => n.id !== oldRecord.id);
        } else {
          const camelRecord = mapToCamelNotification(newRecord);
          const index = notifications.findIndex(n => n.id === camelRecord.id);

          if (index >= 0) {
            notifications[index] = camelRecord;
          } else {
            notifications.unshift(camelRecord);
          }
        }

        // Sort descending
        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const unreadCount = notifications.filter(n => !n.isRead).length;
        set({ notifications, unreadCount });
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ notifications: state.notifications, unreadCount: state.unreadCount }),
    }
  )
);
