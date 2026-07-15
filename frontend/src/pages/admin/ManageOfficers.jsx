import { useState, useEffect } from "react";
import { Briefcase, ArrowRight, UserCheck, Search, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";

export default function ManageOfficers() {
  const [officers, setOfficers] = useState([]);
  const [unassignedComplaints, setUnassignedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [offRes, compRes] = await Promise.all([
        api.getAllOfficers(),
        api.getComplaints({ status: "PENDING" })
      ]);
      if (offRes.data.success) setOfficers(offRes.data.data);
      if (compRes.data.success) setUnassignedComplaints(compRes.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load officer registration and complaint queues.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (complaintId) => {
    if (!selectedOfficer) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.assignComplaintToOfficer(complaintId, selectedOfficer._id);
      if (res.data.success) {
        setSuccess(`Successfully assigned complaint to Officer ${selectedOfficer.fullName}`);
        fetchData(); // reload
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign officer.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Officer Deployments & Manual Assignment</h2>
        <p className="text-sm text-slate-500 mt-1">Review active municipal officer workload distributions and manually allocate unassigned complaints.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Officers Directory */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <span>Active Officers Directory</span>
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : officers.length === 0 ? (
            <p className="text-slate-500 text-sm">No officers currently registered.</p>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {officers.map((off) => (
                <div
                  key={off._id}
                  onClick={() => setSelectedOfficer(off)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedOfficer?._id === off._id
                      ? "border-blue-500 bg-blue-50/40 shadow-sm"
                      : "border-slate-100 bg-slate-50 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="font-semibold text-slate-800 text-sm">{off.fullName}</div>
                  <div className="text-xs text-slate-500 mt-1">Dept: {off.department} • Ward {off.ward || "Global"}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{off.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned / Pending Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <span>Unassigned Pending Issues Queue</span>
          </h3>

          {selectedOfficer ? (
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-xs font-semibold">
              Currently assigning tickets to: <span className="underline">{selectedOfficer.fullName}</span> (Dept: {selectedOfficer.department}, Ward: {selectedOfficer.ward})
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl text-xs font-semibold">
              Please select an officer from the directory panel to begin assigning complaints.
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : unassignedComplaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-100 rounded-2xl">
              <p className="font-semibold">Queue Clear! All reported complaints are assigned to active officers.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {unassignedComplaints.map((c) => (
                <div key={c._id} className="p-4 rounded-xl border border-slate-100 flex justify-between items-center bg-white shadow-sm hover:shadow transition-shadow">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{c.title}</div>
                    <div className="text-xs font-mono text-slate-400 mt-1">ID: {c.complaintId} • Category: {c.category} • Ward: {c.wardNumber}</div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{c.description}</p>
                  </div>
                  <button
                    disabled={!selectedOfficer}
                    onClick={() => handleAssign(c._id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center space-x-1 shadow transition-all active:scale-95"
                  >
                    <span>Assign</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
