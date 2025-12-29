import { useState } from "react";
import AdminNavbar from "../components/navbar/AdminNavbar";
import ActivityLogsSection from "../components/logs/ActivityLogsSection";
import PatchInstallLogsSection from "../components/logs/PatchInstallLogsSection";
import GroupLogsSection from "../components/logs/GroupLogsSection";

function LogsPage() {
  const [activeTab, setActiveTab] = useState("activity"); // "activity" | "patch" | "groups"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <div className="px-[4%] py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Logs
          </h1>
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "activity"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              }`}
            >
              Activity Logs
            </button>
            <button
              onClick={() => setActiveTab("patch")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "patch"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              }`}
            >
              Patch Install Logs
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "groups"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              }`}
            >
              Group Logs
            </button>
          </div>
        </div>

        {activeTab === "activity" ? (
          <ActivityLogsSection />
        ) : activeTab === "patch" ? (
          <PatchInstallLogsSection />
        ) : (
          <GroupLogsSection />
        )}
      </div>
    </div>
  );
}

export default LogsPage;
