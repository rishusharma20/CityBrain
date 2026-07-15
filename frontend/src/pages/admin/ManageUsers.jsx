import { useState, useEffect } from "react";
import { Shield, ShieldAlert, UserCheck, UserX, Search } from "lucide-react";
import { api } from "../../services/api";

export default function ManageUsers() {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCitizens();
  }, []);

  const fetchCitizens = async () => {
    setLoading(true);
    try {
      const res = await api.getAllCitizens();
      if (res.data.success) {
        setCitizens(res.data.data);
      }
    } catch (err) {
      setError("Failed to load citizen directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (id) => {
    setError("");
    setSuccess("");
    try {
      const res = await api.toggleBlockUser(id);
      if (res.data.success) {
        setSuccess(res.data.message);
        fetchCitizens();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle block status.");
    }
  };

  const filtered = citizens.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Citizens Account Management</h2>
        <p className="text-sm text-slate-500 mt-1">Review registration credentials, contact details, and block/unblock citizen roles.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-semibold">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-sm font-semibold">{success}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="font-semibold">No citizens found matching search parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4 sm:px-6">Full Name</th>
                  <th className="p-4 sm:px-6">Email Address</th>
                  <th className="p-4 sm:px-6">Phone</th>
                  <th className="p-4 sm:px-6">Ward</th>
                  <th className="p-4 sm:px-6">Status</th>
                  <th className="p-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:px-6 font-semibold text-slate-800">{c.fullName}</td>
                    <td className="p-4 sm:px-6 text-slate-600">{c.email}</td>
                    <td className="p-4 sm:px-6 text-slate-500">{c.phone}</td>
                    <td className="p-4 sm:px-6 text-slate-500">Ward {c.ward || "Unassigned"}</td>
                    <td className="p-4 sm:px-6">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${c.isBlocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {c.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 text-right">
                      <button
                        onClick={() => handleToggleBlock(c._id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 ml-auto ${
                          c.isBlocked
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            : "bg-red-50 hover:bg-red-100 text-red-700"
                        }`}
                      >
                        {c.isBlocked ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            <span>Block Account</span>
                          </>
                        )}
                      </button>
                    </td>
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
