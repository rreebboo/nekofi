import { create } from 'zustand';

export type NekofiState = 'IDLE' | 'EXPRESSION' | 'INTERACTION';

export type NekofiEmotion = 
  // Expressions
  | 'Happy' | 'Excited' | 'Proud' | 'Curious' | 'Thinking'
  | 'Concerned' | 'Encouraging' | 'Love' | 'Surprised' | 'Shocked'
  | 'Sad' | 'Sleepy' | 'Winking' | 'Laughing' | 'Embarrassed'
  // Idle Animations
  | 'Blinking' | 'Tail Sway' | 'Looking Around' | 'Breathing' 
  | 'Head Tilt' | 'Stretch' | 'Clean Paws' | 'Yawn' 
  | 'Curl Up Sleep' | 'Roll Over'
  // Interactions & Reactions
  | 'Wave Hello' | 'Add Income' | 'Add Expense' | 'Goal Reached' 
  | 'Overspending' | 'Encouraging You' | 'AI Thinking' 
  | 'Listening' | 'Celebration';

export interface NekofiStore {
  state: NekofiState;
  emotion: NekofiEmotion;
  message: string | null;
  triggerAnimation: (
    type: NekofiEmotion,
    message?: string | null,
    durationMs?: number
  ) => void;
  resetToIdle: () => void;
  setIdleMode: (isSleeping: boolean) => void;
  triggerRandomIdle: () => void;
}

export const useNekofiStore = create<NekofiStore>((set, get) => ({
  state: 'IDLE',
  emotion: 'Blinking',
  message: null,

  triggerAnimation: (type, message = null, durationMs = 3000) => {
    set({ state: 'INTERACTION', emotion: type, message });

    // Optional auto-reset to idle
    if (durationMs > 0) {
      setTimeout(() => {
        // Only reset if the current state hasn't been overwritten
        if (get().emotion === type) {
          get().resetToIdle();
        }
      }, durationMs);
    }
  },

  resetToIdle: () => {
    set({
      state: 'IDLE',
      emotion: 'Blinking',
      message: null,
    });
  },

  setIdleMode: (isSleeping) => {
    if (isSleeping) {
      set({ state: 'IDLE', emotion: 'Curl Up Sleep', message: 'Zzz...' });
    } else {
      get().resetToIdle();
    }
  },

  triggerRandomIdle: () => {
    const { state } = get();
    // Only trigger random idle if we are currently just sitting idle
    if (state === 'IDLE') {
      const idles: NekofiEmotion[] = [
        'Blinking', 'Tail Sway', 'Looking Around', 
        'Breathing', 'Head Tilt', 'Stretch', 'Clean Paws', 'Yawn'
      ];
      const randomEmotion = idles[Math.floor(Math.random() * idles.length)];
      set({ emotion: randomEmotion });
      
      // We don't reset to 'Blinking' automatically here, 
      // the loop will just pick a new one next time.
    }
  },

}));
