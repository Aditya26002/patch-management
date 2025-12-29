import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Icon from "../../assets/icon.png";
import ThemeToggle from "./ThemeToggle";

function AdminNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest(".profile-dropdown")) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="w-full px-[4%] py-2 flex items-center justify-between">
        {/* Left section - Logo & Navigation */}
        <div className="flex items-center gap-[8%]">
          {/* Logo */}
          <Link to="/admin" className="flex items-center gap-1 pr-[15%]">
            <img src={Icon} alt="" className="w-7 h-7" />
            <h1 className="text-3xl font-semibold">
              <span className="text-black dark:text-white transition-colors">
                Infra
              </span>
              <span className="text-orange-500">Patch</span>
            </h1>
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-[5%] font-semibold">
            <Link
              to="/admin"
              className={`px-2 py-1 rounded-md transition-all duration-200 ${
                isActive("/admin")
                  ? "bg-orange-500 text-white"
                  : "text-gray-800 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-800"
              }`}
            >
              Overview
            </Link>
            <Link
              to="/admin/hosts"
              className={`px-2 py-1 rounded-md transition-all duration-200 ${
                isActive("/admin/hosts")
                  ? "bg-orange-500 text-white"
                  : "text-gray-800 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-800"
              }`}
            >
              Hosts
            </Link>
            <Link
              to="/admin/groups"
              className={`px-2 py-1 rounded-md transition-all duration-200 ${
                location.pathname === "/admin/groups"
                  ? "bg-orange-500 text-white"
                  : "text-gray-800 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-700"
              }`}
            >
              Groups
            </Link>
            <Link
              to="/admin/patches"
              className={`px-2 py-1 rounded-md transition-all duration-200 ${
                location.pathname === "/admin/patches"
                  ? "bg-orange-500 text-white"
                  : "text-gray-800 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-700"
              }`}
            >
              Patches
            </Link>
            <Link
              to="/admin/scheduler"
              className={`px-2 py-1 rounded-md transition-all duration-200 ${
                location.pathname === "/admin/scheduler"
                  ? "bg-orange-500 text-white"
                  : "text-gray-800 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-700"
              }`}
            >
              Scheduler
            </Link>
            <Link
              to="/admin/logs"
              className={`px-2 py-1 rounded-md transition-all duration-200 ${
                location.pathname === "/admin/logs"
                  ? "bg-orange-500 text-white"
                  : "text-gray-800 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-700"
              }`}
            >
              Logs
            </Link>
          </div>
        </div>

        {/* Right section - Theme toggle & Profile */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Dropdown */}
          <div className="relative profile-dropdown">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                <p className="pb-1">{user?.role === "admin" ? "A" : "U"}</p>
              </div>
              {/* Dropdown Arrow */}
              <svg
                className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform duration-200 ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-4 w-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 transition-all duration-200">
                <button className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                  Manage Users
                </button>
                <button className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                  Generate Reports
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-red-300 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AdminNavbar;
