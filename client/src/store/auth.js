import { create } from 'zustand';
import { authApi } from '../api/index.js';

let initPromise = null;

export const useAuth = create((set) => ({
  user: null,
  loading: true, // initial /me check in flight
  error: null,

  init: async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        const { user } = await authApi.me();
        set({ user, loading: false });
      } catch {
        set({ user: null, loading: false });
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  },

  login: async (email, password) => {
    try {
      const { user } = await authApi.login({ email, password });
      set({ user, error: null });
      return user;
    } catch (error) {
      set({ error });
      throw error;
    }
  },

  register: async (name, email, password) => {
    const { user } = await authApi.register({ name, email, password });
    set({ user, error: null });
    return user;
  },

  demo: async () => {
    const { user } = await authApi.demo();
    set({ user, error: null });
    return user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
