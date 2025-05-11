import React, { useEffect, useState } from 'react';
import { useUserStore } from '../store/useUserStore';

const ProfilePage = () => {
  const {
    user,
    loading,
    error,
    fetchProfile,
    updateProfile,
    uploadProfileImage,
    clearError,
  } = useUserStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      setEditData({ username: user.username, email: user.email });
    }
  }, [user]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ username: user.username, email: user.email });
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

  if (loading && !user) {
    return <p className="text-center text-white">Loading...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500 text-center">
        <p>{error}</p>
        <button onClick={clearError} className="mt-2 underline">Dismiss</button>
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
              {user?.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {/* Fallback SVG */}
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-gradient-to-r from-[#551f2b] via-[#3a1047] to-[#1e0144] hover:from-[#6a2735] hover:via-[#4d1459] hover:to-[#2a0161] text-white rounded-md text-sm font-medium shadow">
                Change Photo
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          {/* Profile Info Section */}
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Account Details</h2>
              {!isEditing ? (
                <button onClick={handleEditClick} className="edit-button">Edit Profile</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} className="edit-button">Save</button>
                  <button onClick={handleCancelEdit} className="edit-button">Cancel</button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Username</label>
                {isEditing ? (
                  <input
                    name="username"
                    value={editData.username}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                  />
                ) : (
                  <p className="text-white">{user?.username}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Email</label>
                {isEditing ? (
                  <input
                    name="email"
                    value={editData.email}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                  />
                ) : (
                  <p className="text-white">{user?.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
