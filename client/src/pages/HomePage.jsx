import { useNavigate } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Patch Management
            </h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">My Systems</p>
                <p className="text-3xl font-bold text-gray-900">12</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Updates Available</p>
                <p className="text-3xl font-bold text-orange-600">5</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Up to Date</p>
                <p className="text-3xl font-bold text-green-600">7</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* My Systems */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            My Systems
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    System Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Last Update
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  {
                    name: "Workstation-001",
                    status: "Up to date",
                    lastUpdate: "2 days ago",
                    needsUpdate: false,
                  },
                  {
                    name: "Workstation-002",
                    status: "Update available",
                    lastUpdate: "5 days ago",
                    needsUpdate: true,
                  },
                  {
                    name: "Laptop-045",
                    status: "Up to date",
                    lastUpdate: "1 day ago",
                    needsUpdate: false,
                  },
                  {
                    name: "Workstation-089",
                    status: "Update available",
                    lastUpdate: "7 days ago",
                    needsUpdate: true,
                  },
                  {
                    name: "Laptop-023",
                    status: "Up to date",
                    lastUpdate: "3 days ago",
                    needsUpdate: false,
                  },
                ].map((system, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {system.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          system.needsUpdate
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {system.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {system.lastUpdate}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {system.needsUpdate ? (
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          Update Now
                        </button>
                      ) : (
                        <button
                          className="text-gray-400 cursor-not-allowed"
                          disabled
                        >
                          No action needed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Updates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Available Updates
          </h2>
          <div className="space-y-4">
            {[
              {
                name: "Security Update KB5012345",
                severity: "Critical",
                size: "45 MB",
              },
              {
                name: "Feature Update 2024-11",
                severity: "Important",
                size: "128 MB",
              },
              {
                name: "Driver Update - Graphics",
                severity: "Recommended",
                size: "12 MB",
              },
            ].map((update, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{update.name}</h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        update.severity === "Critical"
                          ? "bg-red-100 text-red-800"
                          : update.severity === "Important"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {update.severity}
                    </span>
                    <span className="text-sm text-gray-600">{update.size}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                  Install
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
