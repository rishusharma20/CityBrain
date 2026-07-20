import { useState, useEffect } from "react";
import { AlertCircle, MapPin, Upload, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";

const CATEGORIES = [
  "Garbage",
  "Potholes",
  "Street Lights",
  "Water Supply",
  "Drainage",
  "Sewage",
  "Infrastructure",
  "Others"
];

export default function CreateComplaint() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Garbage");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [wardNumber, setWardNumber] = useState("");
  const [imageLink, setImageLink] = useState("");

  // Attempt browser geolocation auto-fill on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6));
          setLongitude(position.coords.longitude.toFixed(6));
        },
        (err) => {
          console.warn("Geolocation access denied or failed:", err.message);
        }
      );
    }
  }, []);

  // Image handlers removed for simpler UI

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess("");
    setLoading(true);

    const payload = {
      title,
      description,
      category,
      latitude: latitude ? parseFloat(latitude) : 12.9716,
      longitude: longitude ? parseFloat(longitude) : 77.5946,
      address,
      wardNumber: parseInt(wardNumber),
      images: imageLink.trim() ? [imageLink.trim()] : []
    };

    try {
      const res = await api.createComplaint(payload);
      if (res.data.success) {
        const comp = res.data.data.complaint;
        setSuccess(`Issue reported successfully! Complaint ID: ${comp.complaintId}`);
        // Reset form
        setTitle("");
        setDescription("");
        setLatitude("");
        setLongitude("");
        setAddress("");
        setWardNumber("");
        setImageLink("");
        
        setTimeout(() => {
          navigate("/dashboard/my-complaints");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit issue. Please check all fields.");
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Report a New Civic Issue</h2>
          <p className="text-sm text-slate-500 mt-1">Fill out the details. Our duplicate detection and assignment pipelines will run instantly.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-sm font-medium flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc pl-9 space-y-1 text-xs">
                {Object.values(fieldErrors).map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Complaint Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Broken streetlight on 4th cross road"
                maxLength={150}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <span className="text-xs text-slate-400">Must be between 5 and 150 characters.</span>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information regarding the problem (minimum 20 characters)..."
                rows={4}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              ></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Ward Number</label>
              <input
                type="number"
                value={wardNumber}
                onChange={(e) => setWardNumber(e.target.value)}
                placeholder="e.g. 15"
                min="1"
                max="100"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Latitude and Longitude fields are hidden for simplicity and auto-fetched via geolocation */}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Address / Location Reference</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Sector-3, HSR Layout, Next to Shell Petrol Pump"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2 border-t border-slate-100 pt-4">
              <label className="text-sm font-semibold text-slate-700">Image Link (Optional)</label>
              <input
                type="url"
                value={imageLink}
                onChange={(e) => setImageLink(e.target.value)}
                placeholder="Paste a link to a photo of the issue"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? "Submitting Issue..." : "File Complaint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
