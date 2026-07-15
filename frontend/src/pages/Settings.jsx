import { useState, useEffect } from "react";
import { User, Bell, Shield, Key, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export default function Settings() {
  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "", role: "", department: "", ward: "" });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getProfile();
      if (res.data.success) {
        setProfile(res.data.user);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load user profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      fullName: profile.fullName,
      phone: profile.phone
    };
    if (password.trim() !== "") {
      payload.password = password;
    }

    try {
      const res = await api.updateProfile(payload);
      if (res.data.success) {
        setSuccess("Profile settings updated successfully.");
        setPassword("");
        setProfile(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Account Preferences</h2>
        <p className="text-sm text-slate-500 mt-1">Manage profile credentials, contact info, and security configurations.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold">{success}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-slate-50 p-4 border-r border-slate-200">
          <nav className="space-y-1">
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl transition-all">
              <User className="w-4 h-4" />
              <span>Profile Information</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50" disabled>
              <Bell className="w-4 h-4" />
              <span>Notifications Settings</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50" disabled>
              <Shield className="w-4 h-4" />
              <span>Privacy Defaults</span>
            </button>
            <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50" disabled>
              <Key className="w-4 h-4" />
              <span>Login Credentials</span>
            </button>
          </nav>
        </div>

        {/* Content Form */}
        <div className="flex-1 p-6 sm:p-8">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Edit Profile Details</h3>
          
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold uppercase shadow">
                {profile.fullName?.charAt(0) || "U"}
              </div>
              <div className="text-xs text-slate-400 font-semibold">Avatar auto-derived from name.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">User Role</label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
                />
              </div>

              {profile.role === "Officer" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={profile.department || "General"}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                </div>
              )}

              {profile.role !== "Admin" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Ward Number</label>
                  <input
                    type="text"
                    value={profile.ward || "Unassigned"}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2 border-t border-slate-100 pt-4">
                <label className="text-sm font-semibold text-slate-700 block">Change Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Input new password..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
