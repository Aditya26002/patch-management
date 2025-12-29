import { useState } from "react";
import AdminNavbar from "../components/navbar/AdminNavbar";
import SchedulePatchSection from "../components/scheduler/SchedulePatchSection";
import ScheduleUpdateSection from "../components/scheduler/ScheduleUpdateSection";

function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("patch"); // "patch" | "update"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <div className="px-[4%] py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Task Scheduler
          </h1>
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setActiveTab("patch")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "patch"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Schedule Patch
            </button>
            <button
              onClick={() => setActiveTab("update")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "update"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Schedule Update
            </button>
          </div>
        </div>

        {activeTab === "patch" ? (
          <SchedulePatchSection />
        ) : (
          <ScheduleUpdateSection />
        )}
      </div>
    </div>
  );
}

export default SchedulerPage;
