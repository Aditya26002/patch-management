import React from "react";

function GroupDetailsDialog({ show, group, onClose }) {
  if (!show || !group) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-300 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Group Details
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            View details for {group.name}
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group Name
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {group.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Operating System
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {group.os}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hosts ({group.hosts.length})
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
              {group.hosts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm p-4">
                  No hosts in this group
                </p>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {group.hosts.map((host) => (
                    <div
                      key={host._id}
                      className="p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {host.ip}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {host.osName} {host.osVersion} • {host.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last Scan:{" "}
                          {host.lastScan
                            ? new Date(host.lastScan).toLocaleDateString()
                            : "Never"}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Pending Patches: {host.pendingPatches || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupDetailsDialog;
