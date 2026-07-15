import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

export default function OfficerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.getOfficerDashboard();
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error("Failed to load officer dashboard data:", error);
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

  const summary = data?.summary || { totalAssigned: 0, pending: 0, resolved: 0, escalated: 0 };
  const latest = data?.latestComplaints || [];

  const cards = [
    { title: "Total Scope Issues", value: summary.totalAssigned, icon: FileText, color: "text-blue-600", bg: "bg-blue-100/50" },
    { title: "Resolved Issues", value: summary.resolved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100/50" },
    { title: "Active Cases", value: summary.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-100/50" },
    { title: "Escalated Cases", value: summary.escalated, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100/50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Officer Work Control Room</h2>
        <p className="text-sm text-slate-500 mt-1">Review issues reported within your department and ward jurisdiction.</p>
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">New Queue / Auto-Assigned Issues</h3>
            <p className="text-xs text-slate-500 mt-1">Claims and priority tickets awaiting action.</p>
          </div>
          <Link to="/officer/assigned" className="text-sm text-blue-600 hover:underline font-semibold flex items-center space-x-1">
            <span>Manage All Assigned</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold">Queue is clear! No active complaints reported in your jurisdiction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Issue Details</th>
                  <th className="p-4 sm:px-6">Citizen</th>
                  <th className="p-4 sm:px-6">Status</th>
                  <th className="p-4 sm:px-6">SLA Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {latest.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">ID: {c.complaintId} • Ward {c.wardNumber}</div>
                    </td>
                    <td className="p-4 sm:px-6">
                      <div className="font-medium text-slate-700">{c.createdBy?.fullName || "Anonymous"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.createdBy?.phone || ""}</div>
                    </td>
                    <td className="p-4 sm:px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${c.status === "PENDING" ? "bg-slate-100 text-slate-700" : c.status === "ASSIGNED" ? "bg-blue-100 text-blue-700" : c.status === "ACCEPTED" ? "bg-indigo-100 text-indigo-700" : c.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" : c.status === "RESOLVED" || c.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 text-slate-500">{new Date(c.slaDeadline).toLocaleDateString()}</td>
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
