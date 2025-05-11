import { create } from "zustand";
import axios from "axios";

axios.defaults.withCredentials = true;

const API_BASE = import.meta.env.MODE === "development"
  ? "http://localhost:5000/api"
  : "/api";

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isCheckingAuth: true,

  register: async ({ username, email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        username,
        email,
        password,
      });

      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Registration failed",
        isLoading: false,
      });
      throw err;
    }
  },

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password,
      });

      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err.response?.data?.message || "Login failed",
        isLoading: false,
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_BASE}/auth/logout`);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: "Logout failed",
        isLoading: false,
      });
      throw err;
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axios.get(`${API_BASE}/users/profile`);
      set({
        user: {
          username: res.data.username,
          email: res.data.email,
          createdAt: res.data.createdAt,
        },
        isAuthenticated: true,
        isCheckingAuth: false,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
