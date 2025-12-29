import React from "react";

function ScheduleDialog({
  show,
  taskType,
  selectedItems,
  compatibleHosts,
  scheduledDateTime,
  onConfirm,
  onClose,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Confirm {taskType === "patch" ? "Patch Deployment" : "Host Update"}{" "}
            Schedule
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review the schedule details before confirming
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Scheduled Time */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Scheduled Time
            </h3>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {scheduledDateTime?.toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Selected Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Selected {taskType === "patch" ? "Patches" : "Hosts"} (
              {selectedItems.length})
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
              <ul className="space-y-2">
                {selectedItems.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    {taskType === "patch" ? (
                      <>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {item.patchId}
                        </span>
                        <span>-</span>
                        <span>{item.name}</span>
                        <span className="text-xs text-gray-500">
                          ({item.affectedOS})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {item.ip}
                        </span>
                        <span>-</span>
                        <span>
                          {item.osName} {item.osVersion}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({item.patchCount} updates)
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Compatible Hosts (for patch deployment) */}
          {taskType === "patch" && compatibleHosts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Target Hosts ({compatibleHosts.length})
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {compatibleHosts.map((host) => (
                    <li
                      key={host._id}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      • {host.ip} - {host.osName} {host.osVersion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Important
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  The{" "}
                  {taskType === "patch" ? "patch deployment" : "host update"}{" "}
                  will automatically execute at the scheduled time. Make sure
                  the server is running at that time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScheduleDialog;
