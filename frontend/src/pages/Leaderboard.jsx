import { useState, useEffect } from "react";
import { Award, Briefcase, Map, ShieldAlert, Star } from "lucide-react";
import { api } from "../services/api";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState("officers");
  const [officers, setOfficers] = useState([]);
  const [wards, setWards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const [offRes, wardRes, deptRes] = await Promise.all([
          api.getTopOfficers(),
          api.getTopWards(),
          api.getBestDepartments()
        ]);
        if (offRes.data.success) setOfficers(offRes.data.data);
        if (wardRes.data.success) setWards(wardRes.data.data);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
      } catch (err) {
        console.error("Failed to load leaderboards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboards();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Honor Roll & Rankings Leaderboard</h2>
        <p className="text-sm text-slate-500 mt-1">Review resolution speed, resolution percentages, and SLA benchmarks across CityBrains deployment layers.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border shadow-sm gap-2">
        <button
          onClick={() => setActiveTab("officers")}
          className={`flex-1 py-3 px-4 text-center rounded-xl transition-all font-semibold flex items-center justify-center space-x-2 text-sm ${
            activeTab === "officers" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Award className="h-4.5 w-4.5" />
          <span>Top Officers</span>
        </button>
        <button
          onClick={() => setActiveTab("wards")}
          className={`flex-1 py-3 px-4 text-center rounded-xl transition-all font-semibold flex items-center justify-center space-x-2 text-sm ${
            activeTab === "wards" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Map className="h-4.5 w-4.5" />
          <span>Top Wards</span>
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`flex-1 py-3 px-4 text-center rounded-xl transition-all font-semibold flex items-center justify-center space-x-2 text-sm ${
            activeTab === "departments" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Briefcase className="h-4.5 w-4.5" />
          <span>Best Departments</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === "officers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Rank</th>
                  <th className="p-4 sm:px-6">Officer Name</th>
                  <th className="p-4 sm:px-6">Department</th>
                  <th className="p-4 sm:px-6 text-center">Resolved Cases</th>
                  <th className="p-4 sm:px-6 text-right">SLA compliance rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {officers.map((off, idx) => (
                  <tr key={off._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6 font-bold text-slate-400">
                      {idx + 1 === 1 ? <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> : `#${idx + 1}`}
                    </td>
                    <td className="p-4 sm:px-6 font-semibold text-slate-800">{off.officerName}</td>
                    <td className="p-4 sm:px-6 text-slate-600">{off.department}</td>
                    <td className="p-4 sm:px-6 text-center text-slate-600 font-bold">{off.resolvedCount} <span className="text-slate-400 font-medium">/ {off.totalAssigned}</span></td>
                    <td className="p-4 sm:px-6 text-right font-extrabold text-blue-600">{off.slaCompliancePercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "wards" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Rank</th>
                  <th className="p-4 sm:px-6">Ward</th>
                  <th className="p-4 sm:px-6 text-center">Resolved / Total</th>
                  <th className="p-4 sm:px-6 text-right">Resolution Speed Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {wards.map((w, idx) => (
                  <tr key={w.wardNumber} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="p-4 sm:px-6 font-semibold text-slate-800">{w.ward}</td>
                    <td className="p-4 sm:px-6 text-center text-slate-600 font-bold">{w.resolvedComplaints} <span className="text-slate-400 font-medium">/ {w.totalComplaints}</span></td>
                    <td className="p-4 sm:px-6 text-right font-extrabold text-emerald-600">{w.resolutionRatePercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "departments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Rank</th>
                  <th className="p-4 sm:px-6">Department Name</th>
                  <th className="p-4 sm:px-6 text-center">Resolved / Total</th>
                  <th className="p-4 sm:px-6 text-right">Resolution Performance Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {departments.map((d, idx) => (
                  <tr key={d.department} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6 font-bold text-slate-400">#{idx + 1}</td>
                    <td className="p-4 sm:px-6 font-semibold text-slate-800">{d.department}</td>
                    <td className="p-4 sm:px-6 text-center text-slate-600 font-bold">{d.resolvedComplaints} <span className="text-slate-400 font-medium">/ {d.totalComplaints}</span></td>
                    <td className="p-4 sm:px-6 text-right font-extrabold text-purple-600">{d.resolutionRatePercentage}%</td>
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
