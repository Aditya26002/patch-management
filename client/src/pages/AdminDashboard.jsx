import Overview from "../components/dashboard/Overview";
import UpdateHistory from "../components/dashboard/UpdateHistory";
import AdminNavbar from "../components/navbar/AdminNavbar";

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <Overview />
      <UpdateHistory />
      <div className="px-[4%] py-6"></div>
    </div>
  );
}

export default AdminDashboard;
