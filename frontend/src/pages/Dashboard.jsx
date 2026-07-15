import { useAuth } from "../context/AuthContext";
import CitizenDashboard from "./citizen/CitizenDashboard";
import OfficerDashboard from "./officer/OfficerDashboard";
import AdminDashboard from "./admin/AdminDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  switch (user.role) {
    case "Admin":
      return <AdminDashboard />;
    case "Officer":
      return <OfficerDashboard />;
    case "Citizen":
    default:
      return <CitizenDashboard />;
  }
}
