import { LayoutDashboard, AlertCircle, Map, BarChart2, Settings, LogOut, Plus, Clipboard, History, Users, Briefcase, Bell, Award } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case "Admin":
        return [
          { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { name: "Manage Citizens", path: "/dashboard/users", icon: Users },
          { name: "Manage Officers", path: "/dashboard/officers", icon: Briefcase },
          { name: "Issues Registry", path: "/dashboard/issues", icon: AlertCircle },
          { name: "Live Heatmap", path: "/dashboard/map", icon: Map },
          { name: "Analytics KPIs", path: "/dashboard/analytics", icon: BarChart2 },
          { name: "Leaderboard", path: "/dashboard/leaderboard", icon: Award },
          { name: "Notifications", path: "/dashboard/notifications", icon: Bell },
          { name: "Profile Settings", path: "/dashboard/settings", icon: Settings },
        ];
      case "Officer":
        return [
          { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { name: "Assigned Tickets", path: "/dashboard/assigned-complaints", icon: Clipboard },
          { name: "Performance Logs", path: "/dashboard/officer-history", icon: History },
          { name: "Issues Registry", path: "/dashboard/issues", icon: AlertCircle },
          { name: "Live Heatmap", path: "/dashboard/map", icon: Map },
          { name: "Leaderboard", path: "/dashboard/leaderboard", icon: Award },
          { name: "Notifications", path: "/dashboard/notifications", icon: Bell },
          { name: "Profile Settings", path: "/dashboard/settings", icon: Settings },
        ];
      case "Citizen":
      default:
        return [
          { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { name: "File Complaint", path: "/dashboard/create-complaint", icon: Plus },
          { name: "My Complaints", path: "/dashboard/my-complaints", icon: Clipboard },
          { name: "Leaderboard", path: "/dashboard/leaderboard", icon: Award },
          { name: "Notifications", path: "/dashboard/notifications", icon: Bell },
          { name: "Profile Settings", path: "/dashboard/settings", icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <h1 className="text-xl font-black tracking-tight text-blue-700">CityBrains</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive 
                  ? "bg-blue-50 text-blue-700 font-bold shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-semibold"
        >
          <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-500" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
