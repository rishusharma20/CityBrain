import { useState, useEffect } from "react";
import { Search, Filter, AlertTriangle, CheckCircle, Clock, Trash2, Edit3, ShieldAlert } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["ALL", "PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "COMPLETED", "CLOSED", "ESCALATED"];

export default function Issues() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  const [officers, setOfficers] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchComplaints();
    if (user?.role === "Admin") {
      fetchOfficers();
    }
  }, [statusFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.getComplaints(params);
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load complaints directory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficers = async () => {
    try {
      const res = await api.getAllOfficers();
      if (res.data.success) {
        setOfficers(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load officer list", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this complaint?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.deleteComplaint(id);
      if (res.data.success) {
        setSuccess("Complaint deleted successfully.");
        fetchComplaints();
        setSelectedComplaint(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete complaint. Only PENDING complaints can be deleted.");
    }
  };

  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!assigneeId) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.assignComplaintToOfficer(selectedComplaint._id, assigneeId);
      if (res.data.success) {
        setSuccess("Officer assigned successfully.");
        setAssigneeId("");
        fetchComplaints();
        setSelectedComplaint(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign officer.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "RESOLVED":
      case "COMPLETED":
      case "CLOSED":
        return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1 w-fit"><CheckCircle className="w-3.5 h-3.5"/> {status}</span>;
      case "IN_PROGRESS":
      case "ACCEPTED":
        return <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full flex items-center gap-1 w-fit"><Clock className="w-3.5 h-3.5"/> {status}</span>;
      case "ESCALATED":
        return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full flex items-center gap-1 w-fit"><AlertTriangle className="w-3.5 h-3.5"/> {status}</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full w-fit">{status}</span>;
    }
  };

  const filtered = complaints.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.complaintId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Complaints Registry</h2>
        <p className="text-sm text-slate-500 mt-1">Review active, escalated, and resolved civic tickets in detail.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-semibold">No complaints registered matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Complaint ID & Title</th>
                    <th className="p-4">Ward & Dept</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filtered.map((c) => (
                    <tr
                      key={c._id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedComplaint?._id === c._id ? "bg-blue-50/20" : ""}`}
                      onClick={() => { setSelectedComplaint(c); setError(""); setSuccess(""); }}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 truncate max-w-xs">{c.title}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">ID: {c.complaintId} • Cat: {c.category}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{c.department}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Ward {c.wardNumber}</div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="p-4 text-right">
                        <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 min-h-[400px]">
          {selectedComplaint ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{selectedComplaint.title}</h3>
                  <span className="text-xs font-mono text-slate-400 mt-1 block">ID: {selectedComplaint.complaintId}</span>
                </div>
                {user?.role === "Admin" && selectedComplaint.status === "PENDING" && (
                  <button
                    onClick={() => handleDelete(selectedComplaint._id)}
                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Citizen Description</h4>
                <p className="text-slate-600 text-sm mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</h4>
                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</h4>
                  <p className="text-slate-700 font-semibold mt-1">{selectedComplaint.department}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Officer Assigned</h4>
                  <p className="text-slate-700 font-semibold mt-1">
                    {selectedComplaint.assignedOfficer?.fullName || <span className="text-red-500">Unassigned</span>}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SLA Target</h4>
                  <p className="text-slate-700 font-medium mt-1">{new Date(selectedComplaint.slaDeadline).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Complaint Images</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedComplaint.images.map((img, idx) => (
                      <img key={idx} src={img} alt="Complaint Attachment" className="h-24 w-full object-cover rounded-lg border border-slate-100" />
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Details */}
              {selectedComplaint.duplicateOf && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-amber-800 text-xs font-semibold">
                  <ShieldAlert className="h-4.5 w-4.5 mt-0.5 text-amber-600" />
                  <div>
                    <span>This ticket is flagged as a duplicate.</span>
                    <p className="text-slate-500 font-normal mt-0.5">Linked parent ticket ID: {selectedComplaint.duplicateOf}</p>
                  </div>
                </div>
              )}

              {/* Admin Assignment Actions */}
              {user?.role === "Admin" && selectedComplaint.status === "PENDING" && (
                <form onSubmit={handleAssignOfficer} className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assign Officer Manually</h4>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="">Select Municipal Officer...</option>
                    {officers
                      .filter((o) => o.department === selectedComplaint.department)
                      .map((off) => (
                        <option key={off._id} value={off._id}>
                          {off.fullName} (Ward {off.ward || "Global"})
                        </option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
                  >
                    Assign Selected Officer
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <AlertTriangle className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm font-semibold">Select a complaint from the table list to review descriptions, upvotes, duplicates, and assign officers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
