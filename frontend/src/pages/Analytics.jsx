import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { api } from "../services/api";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#ef4444", "#64748b"];

export default function Analytics() {
  const [breakdown, setBreakdown] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [deptAnalytics, setDeptAnalytics] = useState([]);
  const [responseTime, setResponseTime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [breakdownRes, monthlyRes, deptRes, timeRes] = await Promise.all([
          api.getComplaintBreakdown(),
          api.getMonthlyTrend(),
          api.getDepartmentAnalytics(),
          api.getResponseTimeAnalytics()
        ]);

        if (breakdownRes.data.success) setBreakdown(breakdownRes.data.data);
        if (monthlyRes.data.success) setMonthlyTrend(monthlyRes.data.data);
        if (deptRes.data.success) setDeptAnalytics(deptRes.data.data);
        if (timeRes.data.success) setResponseTime(timeRes.data.data);
      } catch (err) {
        console.error("Failed to load analytics data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Format Status Pie Data
  const statusPieData = breakdown?.byStatus?.map((item) => ({
    name: item._id,
    value: item.count,
  })) || [];

  // Format Department Bar Data
  const deptBarData = breakdown?.byDepartment?.map((item) => ({
    name: item._id || "General",
    count: item.count,
  })) || [];

  // Format Monthly Trend Data
  const monthlyTrendData = monthlyTrend.map((item) => ({
    name: `${item._id.month}/${item._id.year}`,
    Issues: item.totalCreated,
    Resolved: item.totalResolved,
  })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Analytics Insights Hub</h2>
        <p className="text-sm text-slate-500 mt-1">Review live resolution metrics, departmental performance benchmarks, and monthly trend reports.</p>
      </div>

      {responseTime && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Platform Performance Metrics</h3>
            <p className="text-xs text-slate-500 mt-0.5">Average system-wide complaint resolution benchmarks.</p>
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <span className="text-xs text-blue-700 block font-semibold">Total Resolved Cases</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{responseTime.resolvedCount}</span>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl">
              <span className="text-xs text-purple-700 block font-semibold">Average Response Speed</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{responseTime.avgResolutionTimeHours} Hours</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Monthly Ingestion & Resolution Trends</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly trends tracking reported vs resolved tickets.</p>
          </div>
          <div className="h-72 w-full">
            {monthlyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Not enough data to display trend chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="Issues" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Breakdown Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Tickets by Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Current operational breakdown of all cases.</p>
          </div>
          <div className="flex-1 relative min-h-[220px]">
            {statusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No ticket status data.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-slate-800">
                    {statusPieData.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Tickets</span>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-4">
            {statusPieData.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                <span className="text-slate-600 truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Distribution Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Department Ticket Volumes</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visualizing complaint density across departments.</p>
          </div>
          <div className="h-72 w-full">
            {deptBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No department data reported.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
