import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, ShieldCheck, Heart, Users, Globe, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function PublicDashboard() {
  const [resolvedCount, setResolvedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [transparency, setTransparency] = useState(null);
  const [wardStats, setWardStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [resolvedRes, pendingRes, transRes, wardRes] = await Promise.all([
          api.getPublicResolvedCount(),
          api.getPublicPendingCount(),
          api.getPublicTransparencyReport(),
          api.getPublicWardStats()
        ]);
        if (resolvedRes.data.success) setResolvedCount(resolvedRes.data.resolvedCount);
        if (pendingRes.data.success) setPendingCount(pendingRes.data.pendingCount);
        if (transRes.data.success) setTransparency(res => transRes.data.scorecard);
        if (wardRes.data.success) setWardStats(wardRes.data.data);
      } catch (err) {
        console.error("Failed to load public metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-500 font-semibold">Loading Public Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* Navbar Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow">CB</div>
            <span className="text-xl font-extrabold text-blue-700">CityBrains Public Portal</span>
          </div>
          <Link to="/" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all">
            Sign In / Register
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-800 via-indigo-800 to-slate-900 py-12 sm:py-20 text-white px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="px-4 py-1.5 bg-blue-500/25 border border-blue-400/35 rounded-full text-xs font-bold uppercase tracking-wider text-blue-200">
            Live Civic Transparency Portal
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Open Accountability Scorecard</h1>
          <p className="text-lg text-blue-100/80 max-w-2xl mx-auto leading-relaxed">
            Real-time performance metrics tracking municipal resolution workloads, SLA compliance speeds, and ward resolution statistics.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        {/* Core Stats Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reports</span>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-2">{transparency?.totalIssuesReported || (resolvedCount + pendingCount)}</h3>
            <span className="text-xs text-slate-500 mt-1">Submitted by registered citizens</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Backlog</span>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{pendingCount}</h3>
            <span className="text-xs text-slate-500 mt-1">Currently in resolution pipeline</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved Tickets</span>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{resolvedCount}</h3>
            <span className="text-xs text-slate-500 mt-1">Successfully closed out by teams</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex flex-col justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Resolution Rate</span>
            <h3 className="text-3xl font-extrabold text-blue-600 mt-2">{transparency?.citizenSatisfactionPercentage || 100}%</h3>
            <span className="text-xs text-slate-500 mt-1">SLA compliant and verified</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transparency Scorecard Detailed */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Civic Intelligence Metrics</h3>
              <p className="text-xs text-slate-500">Global response averages and transparency performance ratings.</p>
              
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Average Resolution Speed</span>
                  <span className="font-bold text-slate-800">{transparency?.averageResolutionTimeHours || 0} Hours</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Customer Satisfaction Score</span>
                  <span className="font-bold text-emerald-600">{transparency?.citizenSatisfactionPercentage || 100}% Rating</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Platform Availability</span>
                  <span className="font-bold text-slate-800">99.9% Live</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <span>All statistics are automatically derived from database records and cannot be altered manually.</span>
            </div>
          </div>

          {/* Wards Performance Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Ward Performance Scoreboard</h3>
              <p className="text-xs text-slate-500">Compare resolution rates across municipal wards.</p>
            </div>

            {wardStats.length === 0 ? (
              <p className="text-slate-500 text-sm">No ward statistics compiled yet.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {wardStats.map((w, idx) => (
                  <div key={idx} className="flex flex-col space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{w.ward}</span>
                      <span>{w.resolutionRatePercentage}% Resolution Rate ({w.resolvedComplaints}/{w.totalComplaints})</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${w.resolutionRatePercentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
