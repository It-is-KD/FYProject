import { create } from 'zustand';
import axios from 'axios';

export const useUserStore = create((set) => ({
  user: null,
  history: [],
  loading: false,
  error: null,

  // Fetch profile
  fetchProfile: async () => {
    try {
      set({ loading: true });
      const { data } = await axios.get('/api/user/profile');
      set({ user: data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch profile', loading: false });
    }
  },

  // Fetch upload history
  fetchHistory: async () => {
    try {
      set({ loading: true });
      const { data } = await axios.get('/api/user/history');
      set({ history: data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch history', loading: false });
    }
  },

  // Update profile (PATCH /update-profile)
  updateProfile: async (updatedData) => {
    try {
      set({ loading: true });
      const { data } = await axios.patch('/api/user/update-profile', updatedData);
      set({ user: data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update profile', loading: false });
    }
  },

  // Upload new profile image (PUT /profile-image)
  uploadProfileImage: async (formData) => {
    try {
      set({ loading: true });
      const { data } = await axios.put('/api/user/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((state) => ({
        user: { ...state.user, profileImage: data.profileImage },
        loading: false,
      }));
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to upload profile image', loading: false });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
