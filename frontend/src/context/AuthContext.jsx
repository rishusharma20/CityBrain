import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const res = await axios.get("http://localhost:8000/api/auth/profile");
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error("Failed to load user profile:", error);
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post("http://localhost:8000/api/auth/login", { email, password });
      if (res.data.success) {
        const newToken = res.data.token;
        localStorage.setItem("token", newToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed. Please check your credentials.",
      };
    }
  };

  const register = async (userData) => {
    try {
      const res = await axios.post("http://localhost:8000/api/auth/register", userData);
      if (res.data.success) {
        const newToken = res.data.token;
        localStorage.setItem("token", newToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(res.data.user);
        return { success: true, user: res.data.user };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed.",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
