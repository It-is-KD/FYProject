import { create } from "zustand";
import axios from "axios";

axios.defaults.withCredentials = true;

const api = import.meta.env.MODE === "development"
  ? "http://localhost:5000/api"
  : "/api";

export const useUserStore = create((set) => ({
  user: null,
  history: [],
  loading: false,
  error: null,

  // Fetch profile
  fetchProfile: async () => {
    try {
      set({ loading: true });
      const { data } = await axios.get(`${api}/users/profile`);
      set({ user: data, loading: false });
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      set({ error: error.response?.data?.message || "Failed to fetch profile", loading: false });
    }
  },

  // Fetch upload history
  fetchHistory: async () => {
    try {
      set({ loading: true });
      const { data } = await axios.get(`${api}/users/history`);
      set({ history: data, loading: false });
    } catch (error) {
      console.error("Error in fetchHistory:", error);
      set({ error: error.response?.data?.message || "Failed to fetch history", loading: false });
    }
  },

  // Update profile (PATCH /update-profile)
  updateProfile: async (updatedData) => {
    try {
      set({ loading: true });
      const { data } = await axios.patch(`${api}/users/update-profile`, updatedData);
      set({ user: data, loading: false });
    } catch (error) {
      console.error("Error in updateProfile:", error);
      set({ error: error.response?.data?.message || "Failed to update profile", loading: false });
    }
  },

  // Upload new profile image (PUT /profile-image)
  uploadProfileImage: async (formData) => {
    try {
      set({ loading: true });
      const { data } = await axios.put(`${api}/users/profile-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set((state) => ({
        user: { ...state.user, profileImage: data.profileImage },
        loading: false,
      }));
    } catch (error) {
      console.error("Error in uploadProfileImage:", error);
      set({ error: error.response?.data?.message || "Failed to upload profile image", loading: false });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));