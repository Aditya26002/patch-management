import React, { useState, useEffect } from "react";
import ScheduleDialog from "./ScheduleDialog";
import ScheduledTasksTable from "./ScheduledTasksTable";
import Toast from "../common/Toast";
import LoadingOverlay from "../common/LoadingOverlay";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function SchedulePatchSection() {
  const [patches, setPatches] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [selectedPatch, setSelectedPatch] = useState(null);
  const [selectedHosts, setSelectedHosts] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [showHostDialog, setShowHostDialog] = useState(false);
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
        // Sort by soonest scheduledTime first (upcoming at top)
        const sorted = [...data.data].sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
        setScheduledTasks(sorted);
      }
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
    }
  };

  const handlePatchSelection = (patchId) => {
    setSelectedPatch(patchId);
    setSelectedHosts([]); // Reset hosts when patch changes
    setShowHostDialog(true);
  };

  const handleHostSelection = (hostId) => {
    setSelectedHosts((prev) =>
      prev.includes(hostId)
        ? prev.filter((id) => id !== hostId)
        : [...prev, hostId]
    );
  };

  // No select all for single patch

  const handleScheduleClick = () => {
    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = async () => {
    setIsLoading(true);
    setShowScheduleDialog(false); // Auto-close dialog immediately
    try {
      const patchObj = patches.find((p) => p._id === selectedPatch);
      const osType = patchObj.affectedOS.includes("Windows") ? "Windows" : "Linux";
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const response = await fetch(`${API_BASE_URL}/scheduler/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: "patch",
          scheduledTime: scheduledDateTime,
          patchIds: [selectedPatch],
          hostIds: selectedHosts,
          osType,
          createdBy: "Admin",
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Compose message with patch and hosts
        const patchName = patchObj.patchId + (patchObj.name ? ` (${patchObj.name})` : "");
        const hostList = hosts.filter(h => selectedHosts.includes(h._id)).map(h => h.ip).join(", ");
        setResultMessage({
          type: "success",
          text: `This action will schedule '${patchName}' to the following host(s): ${hostList} at ${new Date(scheduledDateTime).toLocaleString()}`,
        });
        setSelectedPatch(null);
        setSelectedHosts([]);
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
    if (!selectedPatch) return [];
    const patchObj = patches.find((p) => p._id === selectedPatch);
    if (!patchObj) return [];
    const osType = patchObj.affectedOS.includes("Windows") ? "Windows" : "Linux";
    return hosts.filter((host) => host.osName === osType);
  };

  return (
    <div className="space-y-4 text-xs">{/* smaller font */}
      {isLoading && <LoadingOverlay message="Scheduling patch deployment..." />}
      {resultMessage && (
        <Toast
          message={resultMessage.text}
          type={resultMessage.type}
          onClose={() => setResultMessage(null)}
        />
      )}
      {/* Patches Table (single-select radio) with pagination */}
      {(() => {
        const [patchPage, setPatchPage] = React.useState(1);
        const patchPageSize = 10;
        const patchTotalPages = Math.ceil(filteredPatches.length / patchPageSize);
        const paginatedPatches = filteredPatches.slice((patchPage - 1) * patchPageSize, patchPage * patchPageSize);
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Select Patch to Schedule {selectedPatch ? '(1 selected)' : ''}
              </h2>
              <input
                type="text"
                placeholder="Search patches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left">Select</th>
                    <th className="px-4 py-2 text-left font-semibold">Patch ID</th>
                    <th className="px-4 py-2 text-left font-semibold">Patch Name</th>
                    <th className="px-4 py-2 text-center font-semibold">Affected OS</th>
                    <th className="px-4 py-2 text-center font-semibold">Category</th>
                    <th className="px-4 py-2 text-center font-semibold">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedPatches.map((patch) => (
                    <tr
                      key={patch._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <input
                          type="radio"
                          name="patchSelect"
                          checked={selectedPatch === patch._id}
                          onChange={() => handlePatchSelection(patch._id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-xs text-blue-600 font-medium">
                        {patch.patchId}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-900 dark:text-white">
                        {patch.name}
                      </td>
                      <td className="px-4 py-2 text-xs text-center text-gray-700 dark:text-gray-300">
                        {Array.isArray(patch.affectedOS)
                          ? patch.affectedOS.join(", ")
                          : patch.affectedOS}
                      </td>
                      <td className="px-4 py-2 text-xs text-center text-gray-700 dark:text-gray-300">
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
            {/* Pagination Controls */}
            {patchTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-2">
                <button
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
                  disabled={patchPage === 1}
                  onClick={() => setPatchPage(patchPage - 1)}
                >
                  Prev
                </button>
                <span className="text-xs">Page {patchPage} of {patchTotalPages}</span>
                <button
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
                  disabled={patchPage === patchTotalPages}
                  onClick={() => setPatchPage(patchPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      })()}
      {/* Host & Date/Time Modal */}
      {showHostDialog && (
        <ScheduleDialog
          show={showHostDialog}
          taskType="patch"
          selectedItems={patches.filter((p) => p._id === selectedPatch)}
          compatibleHosts={getCompatibleHosts()}
          scheduledDateTime={scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null}
          onConfirm={() => {
            setShowHostDialog(false);
            handleScheduleClick();
          }}
          onClose={() => setShowHostDialog(false)}
          selectedHosts={selectedHosts}
          setSelectedHosts={setSelectedHosts}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          scheduledTime={scheduledTime}
          setScheduledTime={setScheduledTime}
        />
      )}
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
        selectedItems={patches.filter((p) => p._id === selectedPatch)}
        compatibleHosts={hosts.filter((h) => selectedHosts.includes(h._id))}
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
