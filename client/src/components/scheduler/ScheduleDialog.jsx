import React from "react";

function ScheduleDialog({
  show,
  taskType,
  selectedItems,
  compatibleHosts,
  scheduledDateTime,
  onConfirm,
  onClose,
  selectedHosts,
  setSelectedHosts,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
}) {
  if (!show) return null;

  // Ensure selectedHosts is always an array
  selectedHosts = selectedHosts || [];

  // Host selection and date/time picker for patch scheduling
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-auto text-xs">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {taskType === "patch" ? "Schedule Patch Deployment" : "Schedule Host Update"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Select hosts and schedule time for the selected patch.
          </p>
        </div>
        <div className="p-4 space-y-4">
          {/* Host Selection */}
          {taskType === "patch" && compatibleHosts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                Select Target Hosts ({selectedHosts.length} selected)
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 max-h-32 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 text-left">Select</th>
                      <th className="px-2 py-1 text-left">IP</th>
                      <th className="px-2 py-1 text-left">OS</th>
                      <th className="px-2 py-1 text-left">Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compatibleHosts.map((host) => (
                      <tr key={host._id}>
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedHosts.includes(host._id)}
                            onChange={() => {
                              setSelectedHosts((prev) =>
                                prev.includes(host._id)
                                  ? prev.filter((id) => id !== host._id)
                                  : [...prev, host._id]
                              );
                            }}
                            className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-1 text-xs text-blue-600 font-medium">{host.ip}</td>
                        <td className="px-2 py-1 text-xs text-gray-900 dark:text-white">{host.osName}</td>
                        <td className="px-2 py-1 text-xs text-gray-900 dark:text-white">{host.osVersion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Date & Time Picker */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"
                min={scheduledDate === new Date().toISOString().split("T")[0] ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined}
              />
            </div>
          </div>
          {/* Confirmation Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 mt-2">
            <span className="text-xs text-blue-700 dark:text-blue-400">
              {selectedItems.length > 0 && selectedHosts?.length > 0 && scheduledDate && scheduledTime
                ? `Selected patch will be scheduled on the selected host(s) at ${scheduledDate} ${scheduledTime}.`
                : "Please select patch, hosts, date and time."}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
            disabled={selectedHosts?.length === 0 || !scheduledDate || !scheduledTime}
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScheduleDialog;
