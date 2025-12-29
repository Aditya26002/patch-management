import { useState, useEffect } from "react";
import ScheduleDialog from "./ScheduleDialog";
import ScheduledTasksTable from "./ScheduledTasksTable";
import Toast from "../common/Toast";
import LoadingOverlay from "../common/LoadingOverlay";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function SchedulePatchSection() {
  const [patches, setPatches] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [selectedPatches, setSelectedPatches] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPatches();
    fetchHosts();
    fetchScheduledTasks();
  }, []);

  const fetchPatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/patches`);
      const data = await response.json();
      if (data.success) {
        setPatches(data.data);
      }
    } catch (error) {
      console.error("Error fetching patches:", error);
    }
  };

  const fetchHosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hosts`);
      const data = await response.json();
      if (data.success) {
        setHosts(data.data);
      }
    } catch (error) {
      console.error("Error fetching hosts:", error);
    }
  };

  const fetchScheduledTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/scheduler/tasks?taskType=patch`);
      const data = await response.json();
      if (data.success) {
        setScheduledTasks(data.data);
      }
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
    }
  };

  const handlePatchSelection = (patchId) => {
    setSelectedPatches((prev) =>
      prev.includes(patchId)
        ? prev.filter((id) => id !== patchId)
        : [...prev, patchId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatches.length === filteredPatches.length) {
      setSelectedPatches([]);
    } else {
      setSelectedPatches(filteredPatches.map((p) => p._id));
    }
  };

  const handleScheduleClick = () => {
    if (selectedPatches.length === 0) {
      setResultMessage({
        type: "error",
        text: "Please select at least one patch to schedule",
      });
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setResultMessage({
        type: "error",
        text: "Please select a date and time for scheduling",
      });
      return;
    }

    // Validate OS compatibility
    const selectedPatchObjects = patches.filter((p) =>
      selectedPatches.includes(p._id)
    );

    const hasWindows = selectedPatchObjects.some((p) =>
      p.affectedOS.includes("Windows")
    );
    const hasLinux = selectedPatchObjects.some((p) =>
      p.affectedOS.includes("Linux")
    );

    if (hasWindows && hasLinux) {
      setResultMessage({
        type: "error",
        text: "Cannot mix Windows and Linux patches. Please select patches for one OS type only.",
      });
      return;
    }

    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = async () => {
    setIsLoading(true);
    try {
      const selectedPatchObjects = patches.filter((p) =>
        selectedPatches.includes(p._id)
      );

      const osType = selectedPatchObjects[0].affectedOS.includes("Windows")
        ? "Windows"
        : "Linux";

      const scheduledDateTime = new Date(
        `${scheduledDate}T${scheduledTime}`
      ).toISOString();

      const response = await fetch(`${API_BASE_URL}/scheduler/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "patch",
          scheduledTime: scheduledDateTime,
          patchIds: selectedPatches,
          osType,
          createdBy: "Admin",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultMessage({
          type: "success",
          text: `Patch deployment scheduled successfully for ${new Date(
            scheduledDateTime
          ).toLocaleString()}`,
        });
        setSelectedPatches([]);
        setScheduledDate("");
        setScheduledTime("");
        fetchScheduledTasks();
      } else {
        setResultMessage({
          type: "error",
          text: data.error || "Failed to schedule patch deployment",
        });
      }
    } catch (error) {
      setResultMessage({
        type: "error",
        text: error.message || "Failed to schedule patch deployment",
      });
    } finally {
      setIsLoading(false);
      setShowScheduleDialog(false);
    }
  };

  const handleCancelTask = async (taskId) => {
    if (!confirm("Are you sure you want to cancel this scheduled task?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/scheduler/tasks/${taskId}/cancel`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cancelledBy: "Admin" }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setResultMessage({
          type: "success",
          text: "Task cancelled successfully",
        });
        fetchScheduledTasks();
      } else {
        setResultMessage({
          type: "error",
          text: data.error || "Failed to cancel task",
        });
      }
    } catch (error) {
      setResultMessage({
        type: "error",
        text: "Failed to cancel task",
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/scheduler/tasks/${taskId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        setResultMessage({
          type: "success",
          text: "Task deleted successfully",
        });
        fetchScheduledTasks();
      } else {
        setResultMessage({
          type: "error",
          text: data.error || "Failed to delete task",
        });
      }
    } catch (error) {
      setResultMessage({
        type: "error",
        text: "Failed to delete task",
      });
    }
  };

  const filteredPatches = patches.filter(
    (patch) =>
      patch.patchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompatibleHosts = () => {
    if (selectedPatches.length === 0) return [];

    const selectedPatchObjects = patches.filter((p) =>
      selectedPatches.includes(p._id)
    );

    const osType = selectedPatchObjects[0].affectedOS.includes("Windows")
      ? "Windows"
      : "Linux";

    return hosts.filter((host) => host.osName === osType);
  };

  return (
    <div className="space-y-4">
      {isLoading && <LoadingOverlay message="Scheduling patch deployment..." />}

      {resultMessage && (
        <Toast
          message={resultMessage.text}
          type={resultMessage.type}
          onClose={() => setResultMessage(null)}
        />
      )}

      {/* Date & Time Picker Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Schedule Time
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleScheduleClick}
              disabled={selectedPatches.length === 0 || !scheduledDate || !scheduledTime}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Schedule Selected
            </button>
          </div>
        </div>
      </div>

      {/* Patches Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select Patches to Schedule ({selectedPatches.length} selected)
          </h2>
          <input
            type="text"
            placeholder="Search patches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedPatches.length === filteredPatches.length &&
                      filteredPatches.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-2 text-left font-semibold">Patch ID</th>
                <th className="px-4 py-2 text-left font-semibold">Patch Name</th>
                <th className="px-4 py-2 text-center font-semibold">Affected OS</th>
                <th className="px-4 py-2 text-center font-semibold">Category</th>
                <th className="px-4 py-2 text-center font-semibold">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPatches.map((patch) => (
                <tr
                  key={patch._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedPatches.includes(patch._id)}
                      onChange={() => handlePatchSelection(patch._id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-blue-600 font-medium">
                    {patch.patchId}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {patch.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">
                    {Array.isArray(patch.affectedOS)
                      ? patch.affectedOS.join(", ")
                      : patch.affectedOS}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">
                    {patch.category}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        patch.severity === "Critical"
                          ? "bg-red-100 text-red-700"
                          : patch.severity === "Important"
                          ? "bg-orange-100 text-orange-700"
                          : patch.severity === "Moderate"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {patch.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Tasks Table */}
      <ScheduledTasksTable
        tasks={scheduledTasks}
        onCancel={handleCancelTask}
        onDelete={handleDeleteTask}
        onRefresh={fetchScheduledTasks}
      />

      {/* Schedule Confirmation Dialog */}
      <ScheduleDialog
        show={showScheduleDialog}
        taskType="patch"
        selectedItems={patches.filter((p) => selectedPatches.includes(p._id))}
        compatibleHosts={getCompatibleHosts()}
        scheduledDateTime={
          scheduledDate && scheduledTime
            ? new Date(`${scheduledDate}T${scheduledTime}`)
            : null
        }
        onConfirm={handleConfirmSchedule}
        onClose={() => setShowScheduleDialog(false)}
      />
    </div>
  );
}

export default SchedulePatchSection;
