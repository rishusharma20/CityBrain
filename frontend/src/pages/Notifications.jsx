import { useState, useEffect } from "react";
import { Bell, Trash2, CheckSquare, MessageSquare, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const res = await api.markNotificationRead(id);
      if (res.data.success) {
        setNotifications(
          notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      if (res.data.success) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
        setSuccess("All notifications marked as read.");
      }
    } catch (err) {
      setError("Failed to mark all as read.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.deleteNotification(id);
      if (res.data.success) {
        setNotifications(notifications.filter((n) => n._id !== id));
      }
    } catch (err) {
      setError("Failed to delete notification.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await api.deleteAllNotifications();
      if (res.data.success) {
        setNotifications([]);
        setSuccess("Notifications inbox cleared.");
      }
    } catch (err) {
      setError("Failed to clear inbox.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Notifications Inbox</h2>
          <p className="text-sm text-slate-500 mt-1">Live updates regarding assignment, status changes, and resolution details.</p>
        </div>

        {notifications.length > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2 border border-red-100 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear inbox</span>
            </button>
          </div>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold">{success}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bell className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold">Notifications inbox is clear.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`p-5 transition-colors flex justify-between items-start gap-4 cursor-pointer ${
                  n.isRead ? "bg-white" : "bg-blue-50/20"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${n.isRead ? "bg-slate-100 text-slate-400" : "bg-blue-100 text-blue-700"}`}>
                    <Bell className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 bg-blue-600 rounded-full"></span>}
                    </h4>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(n._id);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
