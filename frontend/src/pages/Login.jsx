import { useState, useEffect } from "react";
import { Mail, Lock, User, Building, MapPin, Wifi, Cpu, Globe, Phone } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register, token, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Citizen");
  const [department, setDepartment] = useState("Sanitation");
  const [ward, setWard] = useState("1");

  useEffect(() => {
    if (token && user) {
      navigate("/dashboard");
    }
  }, [token, user, navigate]);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? "#0f172a" : "#f8fafc";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, [isDarkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const res = await login(email, password);
      setLoading(false);
      if (!res.success) {
        setError(res.message);
      } else {
        navigate("/dashboard");
      }
    } else {
      const userData = {
        fullName,
        email,
        password,
        phone,
        role,
        department: role === "Officer" ? department : undefined,
        ward: role !== "Admin" ? ward : undefined,
      };
      const res = await register(userData);
      setLoading(false);
      if (!res.success) {
        setError(res.message);
      } else {
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center font-sans p-4 sm:p-8 transition-colors duration-300 relative overflow-hidden ${isDarkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      
      {/* Vibe: Smart City Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: isDarkMode ? "radial-gradient(#334155 1px, transparent 1px)" : "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      <div className={`absolute top-12 left-12 opacity-10 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}><Building size={120} /></div>
      <div className={`absolute bottom-24 left-24 opacity-10 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}><MapPin size={80} /></div>
      <div className={`absolute top-32 right-32 opacity-10 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}><Wifi size={100} /></div>
      <div className={`absolute bottom-16 right-16 opacity-10 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}><Cpu size={90} /></div>
      <div className={`absolute top-1/2 left-4 opacity-5 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}><Globe size={150} /></div>

      <div className={`w-full max-w-6xl rounded-[2rem] shadow-2xl overflow-hidden flex min-h-[700px] transition-colors duration-300 relative z-10 ${isDarkMode ? "bg-slate-800/95 backdrop-blur" : "bg-white/95 backdrop-blur"}`}>
        
        {/* Left Side: Branding */}
        <div className={`hidden lg:flex flex-col items-center justify-center w-1/2 relative overflow-hidden border-r transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-[#f8fbff] border-slate-100"}`}>
          <div className="z-10 flex flex-col items-center text-center px-8 w-full">
            <img
              src="/citybrains_logo.jpg"
              alt="CityBrains Logo"
              className={`w-full max-w-[280px] aspect-square object-cover rounded-full shadow-lg mb-6 transition-all duration-300 ${isDarkMode ? "shadow-black/40 border-4 border-slate-700 bg-white" : "border-4 border-white shadow-slate-200/50 bg-white"}`}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="mt-8">
              <Link to="/public" className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-semibold shadow hover:bg-blue-700 transition">
                Go to Public Transparency Page
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 lg:p-16 relative justify-center">
          {/* Top right theme toggle */}
          <div className={`absolute top-8 right-8 flex rounded-full p-1 transition-colors ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
            <div 
              onClick={() => setIsDarkMode(true)}
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${isDarkMode ? "bg-slate-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <span className="text-sm font-bold">☾</span>
            </div>
            <div 
              onClick={() => setIsDarkMode(false)}
              className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${!isDarkMode ? "bg-white text-slate-600 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              <span className="text-sm font-bold">☀</span>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">
                {isLogin ? "Welcome Back!" : "Create an Account"}
              </h2>
              <p className="text-slate-500">
                {isLogin ? "Sign in to access your dashboard" : "Sign up to start reporting issues"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button 
                onClick={() => { setIsLogin(true); setError(""); }}
                className={`flex-1 pb-3 text-center transition-colors font-semibold ${isLogin ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                Login
              </button>
              <button 
                onClick={() => { setIsLogin(false); setError(""); }}
                className={`flex-1 pb-3 text-center transition-colors font-semibold ${!isLogin ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full pl-11 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`}
                      required
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full pl-11 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Select Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"}`}
                      >
                        <option value="Citizen">Citizen</option>
                        <option value="Officer">Officer</option>
                      </select>
                    </div>

                    {role !== "Admin" && (
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Ward Number</label>
                        <input
                          type="number"
                          placeholder="Ward (1-100)"
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          min="1"
                          max="100"
                          className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`}
                          required
                        />
                      </div>
                    )}
                  </div>

                  {role === "Officer" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1">Department</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"}`}
                      >
                        <option value="Sanitation">Sanitation</option>
                        <option value="Roads">Roads</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Water">Water</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${isDarkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <button onClick={() => { setIsLogin(false); setError(""); }} className="text-[#3b82f6] font-semibold hover:underline bg-transparent border-0 cursor-pointer">
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button onClick={() => { setIsLogin(true); setError(""); }} className="text-[#3b82f6] font-semibold hover:underline bg-transparent border-0 cursor-pointer">
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
