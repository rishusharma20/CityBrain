import { useState, useEffect } from "react";
import { Check, X, Clipboard, ArrowRight, AlertCircle, MessageSquare } from "lucide-react";
import { api } from "../../services/api";

export default function AssignedComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Action states
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchAssigned();
  }, []);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await api.getAssignedComplaints();
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load assigned complaints.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setError("");
    setSuccess("");
    try {
      const res = await api.acceptComplaint(id);
      if (res.data.success) {
        setSuccess("Complaint accepted.");
        fetchAssigned();
        setSelectedComplaint(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept complaint.");
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason) return;
    setError("");
    setSuccess("");
    try {
      const res = await api.rejectComplaint(selectedComplaint._id, { reason: rejectReason });
      if (res.data.success) {
        setSuccess("Complaint returned to queue.");
        setShowRejectModal(false);
        setRejectReason("");
        fetchAssigned();
        setSelectedComplaint(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject complaint.");
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!remarks.trim()) {
      setError("Please provide remarks for this status transition.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      // Use teammate's endpoint or officer status endpoint. Both should work.
      // Teammate endpoint PUT /api/complaints/:id is verified in postman to work with state transitions
      const res = await api.updateComplaint(selectedComplaint._id, {
        status: newStatus,
        remarks: remarks,
        resolutionRemarks: newStatus === "RESOLVED" ? remarks : undefined
      });
      if (res.data.success) {
        setSuccess(`Status transitioned to ${newStatus}`);
        setRemarks("");
        fetchAssigned();
        setSelectedComplaint(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid status transition.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">My Assigned Complaints</h2>
        <p className="text-sm text-slate-500 mt-1">Accept queue items, update resolution stages, and log progress notes.</p>
      </div>

      {(error || success) && (
        <div className="flex flex-col space-y-2">
          {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-xl">{error}</div>}
          {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-semibold rounded-xl">{success}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Clipboard className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold">No complaints currently assigned to you.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Complaint</th>
                    <th className="p-4">Priority & Ward</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {complaints.map((c) => (
                    <tr
                      key={c._id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedComplaint?._id === c._id ? "bg-blue-50/20" : ""}`}
                      onClick={() => { setSelectedComplaint(c); setError(""); setSuccess(""); }}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 truncate max-w-xs">{c.title}</div>
                        <div className="text-xs font-mono text-slate-400 mt-1">ID: {c.complaintId} • {c.category}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${c.priority === "CRITICAL" || c.priority === "HIGH" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>{c.priority}</span>
                        <div className="text-xs text-slate-500 mt-1">Ward {c.wardNumber}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700">{c.status}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 min-h-[400px]">
          {selectedComplaint ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{selectedComplaint.title}</h3>
                <span className="text-xs font-mono text-slate-400 block mt-1">ID: {selectedComplaint.complaintId} • Ward {selectedComplaint.wardNumber}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Citizen Description</h4>
                <p className="text-slate-600 text-sm mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedComplaint.description}
                </p>
              </div>

              {selectedComplaint.status === "ASSIGNED" ? (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Acceptance</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(selectedComplaint._id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1 shadow-md"
                    >
                      <Check className="h-4 w-4" />
                      <span>Accept Ticket</span>
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold flex items-center justify-center space-x-1 border border-red-100"
                    >
                      <X className="h-4 w-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Progress</h4>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 block">Remarks / Execution Logs</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Input details on current activity, inspections, or resolution details..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {selectedComplaint.status === "ACCEPTED" && (
                      <button
                        onClick={() => handleStatusChange("IN_PROGRESS")}
                        className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2"
                      >
                        <span>Start Work (IN_PROGRESS)</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                    {selectedComplaint.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => handleStatusChange("UNDER_REVIEW")}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2"
                      >
                        <span>Request Inspection (UNDER_REVIEW)</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                    {selectedComplaint.status === "UNDER_REVIEW" && (
                      <button
                        onClick={() => handleStatusChange("RESOLVED")}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2"
                      >
                        <span>Resolve Ticket</span>
                        <Check className="h-4 w-4" />
                      </button>
                    )}

                    {selectedComplaint.status === "RESOLVED" && (
                      <p className="text-xs text-slate-400 font-medium text-center">Awaiting administrator verification to close the case.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Clipboard className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm font-semibold">Select a complaint to take operations like accepting tickets, declining, adding progress notes, or resolving.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center space-x-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-bold text-slate-800">Reject Assigned Ticket</h3>
            </div>
            <form onSubmit={handleReject}>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">Provide the reason for rejecting this assignment. The complaint will be returned to the department pool.</p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Rejection Reason</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Issue is outside my assigned ward, or requires special machinery..."
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
