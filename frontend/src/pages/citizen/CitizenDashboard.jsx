import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, AlertTriangle, Plus, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

export default function CitizenDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, escalated: 0 });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getUserComplaints({ limit: 5 });
        if (res.data.success) {
          const list = res.data.data;
          setRecentComplaints(list);

          // Calculate counters based on user's complaints
          let total = list.length;
          let pending = 0;
          let resolved = 0;
          let escalated = 0;

          // Fetch all to get accurate total counts
          const allRes = await api.getUserComplaints();
          if (allRes.data.success) {
            const allList = allRes.data.data;
            total = allList.length;
            allList.forEach((c) => {
              if (c.status === "RESOLVED" || c.status === "COMPLETED" || c.status === "CLOSED") {
                resolved++;
              } else if (c.status === "ESCALATED") {
                escalated++;
              } else {
                pending++;
              }
            });
          }

          setStats({ total, pending, resolved, escalated });
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Filed Issues", value: stats.total, icon: FileText, color: "text-blue-600", bg: "bg-blue-100/50" },
    { title: "Resolved Issues", value: stats.resolved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100/50" },
    { title: "In Progress / Pending", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-100/50" },
    { title: "Escalated Issues", value: stats.escalated, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100/50" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 sm:p-8 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Report issues, track resolution, build a smart city.</h1>
          <p className="text-blue-100 mt-2 text-sm max-w-xl">
            Each citizen report contributes to real-time analytics, officer workloads, and ward performance tracking.
          </p>
        </div>
        <Link
          to="/dashboard/create-complaint"
          className="flex items-center space-x-2 px-5 py-3 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-102 transition-all active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>File New Complaint</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Your Recent Complaints</h3>
            <p className="text-xs text-slate-500 mt-1">Live status of your submitted civic issues.</p>
          </div>
          <Link to="/dashboard/my-complaints" className="text-sm text-blue-600 hover:underline font-semibold flex items-center space-x-1">
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {recentComplaints.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">You haven't filed any complaints yet.</p>
            <Link to="/dashboard/create-complaint" className="text-blue-600 hover:underline mt-2 inline-block font-semibold">
              Submit your first complaint now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/55 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Issue</th>
                  <th className="p-4 sm:px-6">Category</th>
                  <th className="p-4 sm:px-6">Ward</th>
                  <th className="p-4 sm:px-6">Status</th>
                  <th className="p-4 sm:px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {recentComplaints.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">ID: {c.complaintId}</div>
                    </td>
                    <td className="p-4 sm:px-6 text-slate-600 font-medium">{c.category}</td>
                    <td className="p-4 sm:px-6 text-slate-500">Ward {c.wardNumber}</td>
                    <td className="p-4 sm:px-6">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          c.status === "PENDING"
                            ? "bg-slate-100 text-slate-700"
                            : c.status === "ASSIGNED"
                            ? "bg-blue-100 text-blue-700"
                            : c.status === "ACCEPTED"
                            ? "bg-indigo-100 text-indigo-700"
                            : c.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-700"
                            : c.status === "RESOLVED" || c.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
