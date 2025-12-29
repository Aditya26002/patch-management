import { useState, useEffect } from "react";
import ScheduleDialog from "./ScheduleDialog";
import ScheduledTasksTable from "./ScheduledTasksTable";
import Toast from "../common/Toast";
import LoadingOverlay from "../common/LoadingOverlay";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ScheduleUpdateSection() {
  const [hosts, setHosts] = useState([]);
  const [selectedHosts, setSelectedHosts] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [osFilter, setOsFilter] = useState("all");

  useEffect(() => {
    fetchHosts();
    fetchScheduledTasks();
  }, []);

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
      const response = await fetch(
        `${API_BASE_URL}/scheduler/tasks?taskType=update`
      );
      const data = await response.json();
      if (data.success) {
        setScheduledTasks(data.data);
      }
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
    }
  };

  const handleHostSelection = (hostId) => {
    setSelectedHosts((prev) =>
      prev.includes(hostId)
        ? prev.filter((id) => id !== hostId)
        : [...prev, hostId]
    );
  };

  const handleSelectAll = () => {
    if (selectedHosts.length === filteredHosts.length) {
      setSelectedHosts([]);
    } else {
      setSelectedHosts(filteredHosts.map((h) => h._id));
    }
  };

  const handleScheduleClick = () => {
    if (selectedHosts.length === 0) {
      setResultMessage({
        type: "error",
        text: "Please select at least one host to schedule",
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
    const selectedHostObjects = hosts.filter((h) =>
      selectedHosts.includes(h._id)
    );

    const osTypes = [...new Set(selectedHostObjects.map((h) => h.osName))];

    if (osTypes.length > 1) {
      setResultMessage({
        type: "error",
        text: "Cannot mix Windows and Linux hosts. Please select hosts of the same OS type only.",
      });
      return;
    }

    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = async () => {
    setIsLoading(true);
    try {
      const selectedHostObjects = hosts.filter((h) =>
        selectedHosts.includes(h._id)
      );

      const osType = selectedHostObjects[0].osName;

      const scheduledDateTime = new Date(
        `${scheduledDate}T${scheduledTime}`
      ).toISOString();

      const response = await fetch(`${API_BASE_URL}/scheduler/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "update",
          scheduledTime: scheduledDateTime,
          hostIds: selectedHosts,
          osType,
          createdBy: "Admin",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultMessage({
          type: "success",
          text: `Host update scheduled successfully for ${new Date(
            scheduledDateTime
          ).toLocaleString()}`,
        });
        setSelectedHosts([]);
        setScheduledDate("");
        setScheduledTime("");
        fetchScheduledTasks();
      } else {
        setResultMessage({
          type: "error",
          text: data.error || "Failed to schedule host update",
        });
      }
    } catch (error) {
      setResultMessage({
        type: "error",
        text: error.message || "Failed to schedule host update",
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

  const filteredHosts = hosts.filter((host) => {
    const matchesSearch =
      host.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      host.osName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOS = osFilter === "all" || host.osName === osFilter;
    return matchesSearch && matchesOS;
  });

  return (
    <div className="space-y-4">
      {isLoading && <LoadingOverlay message="Scheduling host update..." />}

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
              disabled={
                selectedHosts.length === 0 || !scheduledDate || !scheduledTime
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Schedule Selected
            </button>
          </div>
        </div>
      </div>

      {/* Hosts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select Hosts to Schedule ({selectedHosts.length} selected)
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={osFilter}
              onChange={(e) => setOsFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All OS</option>
              <option value="Windows">Windows</option>
              <option value="Linux">Linux</option>
            </select>
            <input
              type="text"
              placeholder="Search hosts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedHosts.length === filteredHosts.length &&
                      filteredHosts.length > 0
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-2 text-left font-semibold">Host IP</th>
                <th className="px-4 py-2 text-center font-semibold">OS Name</th>
                <th className="px-4 py-2 text-center font-semibold">
                  OS Version
                </th>
                <th className="px-4 py-2 text-center font-semibold">
                  Available Updates
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredHosts.map((host) => (
                <tr
                  key={host._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedHosts.includes(host._id)}
                      onChange={() => handleHostSelection(host._id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-blue-600 font-medium">
                    {host.ip}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-gray-900 dark:text-white">
                    {host.osName}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300">
                    {host.osVersion}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded-full text-xs font-semibold">
                      {host.patchCount || 0} updates
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
        taskType="update"
        selectedItems={hosts.filter((h) => selectedHosts.includes(h._id))}
        compatibleHosts={[]}
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

export default ScheduleUpdateSection;
