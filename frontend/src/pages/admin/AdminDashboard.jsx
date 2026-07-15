import { useState, useEffect } from "react";
import { FileText, Users, Briefcase, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.getAdminDashboard();
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error("Failed to load admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const counters = data?.counters || { totalCitizens: 0, totalOfficers: 0, totalComplaints: 0, resolvedCount: 0, resolutionRatePercentage: 0 };
  const latest = data?.latestComplaints || [];

  const cards = [
    { title: "Total Registered Citizens", value: counters.totalCitizens, icon: Users, color: "text-blue-600", bg: "bg-blue-100/50" },
    { title: "Total Officers Active", value: counters.totalOfficers, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-100/50" },
    { title: "Total Tickets Reported", value: counters.totalComplaints, icon: FileText, color: "text-amber-600", bg: "bg-amber-100/50" },
    { title: "Resolution Performance", value: `${counters.resolutionRatePercentage}%`, icon: CheckCircle, color: "text-purple-600", bg: "bg-purple-100/50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Admin Control Center</h2>
        <p className="text-sm text-slate-500 mt-1">Global oversight of CityBrains database, citizen registrations, and SLA performances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className={`p-4 rounded-xl ${card.bg} ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{card.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Live Complaints Monitor</h3>
              <p className="text-xs text-slate-500 mt-1">Live incoming reports from all wards.</p>
            </div>
            <Link to="/dashboard/issues" className="text-xs font-bold text-blue-600 hover:underline">
              View All Issues &rarr;
            </Link>
          </div>

          {latest.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-semibold">No complaints registered in the database yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Details</th>
                    <th className="p-4">Citizen</th>
                    <th className="p-4">Officer Assigned</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {latest.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 truncate max-w-xs">{c.title}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">ID: {c.complaintId} • Ward {c.wardNumber}</div>
                      </td>
                      <td className="p-4 text-slate-600">{c.createdBy?.fullName || "Anonymous"}</td>
                      <td className="p-4 text-slate-600 font-semibold">{c.assignedOfficer?.fullName || <span className="text-red-500">Unassigned</span>}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${c.status === "PENDING" ? "bg-slate-100 text-slate-700" : c.status === "RESOLVED" || c.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Operations Links */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <Link
              to="/admin/users"
              className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all font-semibold text-slate-700 text-sm block"
            >
              Manage Registered Citizens &rarr;
            </Link>
            <Link
              to="/admin/officers"
              className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all font-semibold text-slate-700 text-sm block"
            >
              Assign Officer Tickets &rarr;
            </Link>
            <Link
              to="/dashboard/analytics"
              className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 transition-all font-semibold text-slate-700 text-sm block"
            >
              Check Departmental KPIs &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
