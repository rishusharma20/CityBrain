import { useState, useEffect } from "react";
import { Award, ShieldAlert, AwardIcon, CheckCircle, Clock } from "lucide-react";
import { api } from "../../services/api";

export default function OfficerHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [histRes, statsRes] = await Promise.all([
          api.getOfficerHistory(),
          api.getOfficerStatistics()
        ]);
        if (histRes.data.success) setHistory(histRes.data.data);
        if (statsRes.data.success) setStats(statsRes.data.data);
      } catch (error) {
        console.error("Failed to load history data:", error);
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

  const sla = stats?.slaAnalytics || { slaComplianceRatePercentage: 100, onTimeResolutions: 0, breachedResolutions: 0, avgResolutionTimeHours: 0 };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">My Performance & Resolved History</h2>
        <p className="text-sm text-slate-500 mt-1">Review your resolution speed, SLA compliance scorecard, and historical cases.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-2xl border border-blue-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-blue-600 text-white rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">SLA Compliance Rate</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{sla.slaComplianceRatePercentage}%</h3>
            <p className="text-xs text-slate-500 mt-0.5">{sla.onTimeResolutions} on-time, {sla.breachedResolutions} breached</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-emerald-600 text-white rounded-xl">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Resolved Cases</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stats?.resolved || 0}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Out of {stats?.totalAssigned || 0} total cases</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 rounded-2xl border border-purple-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-purple-600 text-white rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Avg. Resolution Speed</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{sla.avgResolutionTimeHours} hrs</h3>
            <p className="text-xs text-slate-500 mt-0.5">Mean time from reporting to completion</p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Historical Resolution Logs</h3>
          <p className="text-xs text-slate-500 mt-1">Archive of all resolved and closed complaints under your name.</p>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Award className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold">No resolved cases found yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Issue ID & Title</th>
                  <th className="p-4 sm:px-6">Category</th>
                  <th className="p-4 sm:px-6">Date Resolved</th>
                  <th className="p-4 sm:px-6">Final Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {history.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6">
                      <div className="font-semibold text-slate-800">{c.title}</div>
                      <div className="text-xs font-mono text-slate-400 mt-1">ID: {c.complaintId} • Ward {c.wardNumber}</div>
                    </td>
                    <td className="p-4 sm:px-6 text-slate-600 font-medium">{c.category}</td>
                    <td className="p-4 sm:px-6 text-slate-500">{c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : new Date(c.updatedAt).toLocaleDateString()}</td>
                    <td className="p-4 sm:px-6 text-slate-600 max-w-xs truncate">{c.resolutionRemarks || c.completionRemarks || "Resolution logging complete."}</td>
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
