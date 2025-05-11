import React, { useEffect, useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';

const ProfilePage = () => {
  const {
    user: fetchedUser,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadProfileImage,
    clearError,
  } = useUserStore();
  const { isAuthenticated } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [fetchProfile, isAuthenticated]);

  useEffect(() => {
    if (fetchedUser) {
      setEditData({ username: fetchedUser.username, email: fetchedUser.email });
    }
  }, [fetchedUser]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (fetchedUser) {
      setEditData({ username: fetchedUser.username, email: fetchedUser.email });
    }
    clearError();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    await updateProfile(editData);
    setIsEditing(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    await uploadProfileImage(formData);
  };

  if (loading && !fetchedUser) {
    return <p className="text-center text-white">Loading...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        <p>{error}</p>
        <button onClick={clearError} className="mt-2 underline">
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="bg-black/30 backdrop-blur-lg rounded-xl shadow-lg border border-gray-700 hover:border-purple-500 transition-all duration-300 p-6">
        <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">
          My Profile
        </h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-40 h-40 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-500 shadow-lg">
              {fetchedUser?.profileImage ? (
                <img
                  src={fetchedUser.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-20 h-20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144] hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161] text-white rounded-md transition-all duration-300 shadow-[0_0_15px_5px_rgba(0,0,0,0.7)] text-sm font-medium">
                Change Photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {/* Profile Info Section */}
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Account Details</h2>
              {!isEditing ? (
                <button
                  onClick={handleEditClick}
                  className="bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144] hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161] text-white px-4 py-1 rounded-md transition-all duration-300 shadow-[0_0_15px_5px_rgba(0,0,0,0.7)] text-sm font-medium flex items-center gap-1"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144] hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161] text-white px-4 py-1 rounded-md transition-all duration-300 shadow-[0_0_15px_5px_rgba(0,0,0,0.7)] text-sm font-medium flex items-center gap-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144] hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161] text-white px-4 py-1 rounded-md transition-all duration-300 shadow-[0_0_15px_5px_rgba(0,0,0,0.7)] text-sm font-medium flex items-center gap-1"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={editData.username}
                    onChange={handleChange}
                    className="w-full p-2.5 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm border border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleChange}
                    className="w-full p-2.5 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm border border-gray-700"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div>
                  <label className="text-gray-400 text-sm">Username</label>
                  <p className="text-white text-lg font-medium">{fetchedUser?.username}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Email</label>
                  <p className="text-white text-lg font-medium">{fetchedUser?.email}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Member Since</label>
                  <p className="text-white text-lg font-medium">{fetchedUser?.createdAt}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;