import { useState, useEffect } from "react";
import { Bell, Search, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function Header() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnread();
    // Poll notifications status periodically
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    try {
      const res = await api.getUnreadNotifications();
      if (res.data.success) {
        setUnreadCount(res.data.count);
      }
    } catch (err) {
      console.warn("Could not retrieve unread notification count.");
    }
  };

  const getGreeting = () => {
    if (!user) return "Welcome to CityBrains! 👋";
    return `Welcome back, ${user.fullName || "User"}! 👋`;
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0 shrink-0">
      <div className="flex items-center space-x-4">
        {/* Mobile sidebar trigger placeholder */}
        <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="hidden sm:block">
          <h2 className="text-base font-extrabold text-slate-800">{getGreeting()}</h2>
          <p className="text-xs text-slate-500 font-medium">Role: {user?.role || "Citizen"} {user?.department ? `• Department: ${user.department}` : ""} {user?.ward ? `• Ward: ${user.ward}` : ""}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6">
        <Link to="/dashboard/notifications" className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-2 h-4 w-4 bg-red-600 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Link>

        <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow">
          {user?.fullName?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
