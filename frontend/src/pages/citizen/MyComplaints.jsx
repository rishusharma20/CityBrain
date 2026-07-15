import { useState, useEffect } from "react";
import { Search, Filter, AlertCircle, FileText, CheckCircle, Clock } from "lucide-react";
import { api } from "../../services/api";

const STATUSES = ["ALL", "PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "UNDER_REVIEW", "RESOLVED", "COMPLETED", "CLOSED", "ESCALATED"];

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.getUserComplaints(params);
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load user complaints:", error);
    } finally {
      setLoading(false);
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
        return <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full flex items-center gap-1 w-fit"><AlertCircle className="w-3.5 h-3.5"/> {status}</span>;
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
        <h2 className="text-2xl font-extrabold text-slate-800">My Filed Complaints</h2>
        <p className="text-sm text-slate-500 mt-1">Track updates, reviews, and resolution timelines for your submitted issues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by title or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
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
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No complaints match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Complaint Details</th>
                    <th className="p-4">Category & Ward</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filtered.map((c) => (
                    <tr key={c._id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedComplaint?._id === c._id ? "bg-blue-50/30" : ""}`} onClick={() => setSelectedComplaint(c)}>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{c.title}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">ID: {c.complaintId}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-700">{c.category}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Ward {c.wardNumber}</p>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="p-4 text-right">
                        <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg">
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details View Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 min-h-[400px]">
          {selectedComplaint ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{selectedComplaint.title}</h3>
                <span className="text-xs font-mono text-slate-400 mt-1 block">ID: {selectedComplaint.complaintId}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SLA Deadline</h4>
                  <p className="text-slate-700 font-medium mt-1">{new Date(selectedComplaint.slaDeadline).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upvotes</h4>
                  <p className="text-slate-700 font-medium mt-1">{selectedComplaint.upvoteCount || 0}</p>
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

              {/* Status History / Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Audit Timeline</h4>
                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {selectedComplaint.statusHistory?.map((hist, idx) => (
                    <div key={idx} className="relative pl-6 flex items-start space-x-2">
                      <div className="absolute left-0.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-white"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{hist.status}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{hist.remarks}</p>
                        <span className="text-[10px] text-slate-400">{new Date(hist.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm font-semibold">Select a complaint from the list to view its complete audit history, photo attachments, and resolution details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
