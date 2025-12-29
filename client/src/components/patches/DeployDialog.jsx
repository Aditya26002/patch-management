import React from "react";

function DeployDialog({
  show,
  currentPatch,
  hosts,
  selectedHostsForDeploy,
  onToggleHostSelection,
  onSelectAll,
  onClose,
  onDeploy,
}) {
  if (!show || !currentPatch) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full border border-gray-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Deploy Patch: {currentPatch.patchName || currentPatch.name}
          </h3>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            {/* Header with Select All */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Select Hosts to Deploy ({hosts.length} available)
              </h4>
              <button
                onClick={() => {
                  if (selectedHostsForDeploy.length === hosts.length) {
                    onSelectAll([]);
                  } else {
                    onSelectAll(hosts.map((h) => h._id));
                  }
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {selectedHostsForDeploy.length === hosts.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {/* Host List */}
            <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
              {hosts.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No hosts available
                </p>
              ) : (
                hosts.map((host) => (
                  <label
                    key={host._id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedHostsForDeploy.includes(host._id)}
                      onChange={() => onToggleHostSelection(host._id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {host.ip}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                          {host.osName}
                        </span>
                      </div>
                      {host.osVersion && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {host.osVersion}
                        </span>
                      )}
                      {host.loginId && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          User: {host.loginId}
                        </span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {selectedHostsForDeploy.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>{selectedHostsForDeploy.length}</strong> host(s)
                  selected for deployment
                </p>
              </div>
            </div>
          )}

          {/* Patch Info Card */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Patch Information
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-medium">{currentPatch.category}</span>
              </div>
              {currentPatch.severity && (
                <div className="flex justify-between">
                  <span>Severity:</span>
                  <span
                    className={`font-medium ${
                      currentPatch.severity === "Critical"
                        ? "text-red-600 dark:text-red-400"
                        : currentPatch.severity === "Important"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {currentPatch.severity}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Affected OS:</span>
                <span className="font-medium">
                  {currentPatch.affectedOS?.join(", ") || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onDeploy}
            disabled={selectedHostsForDeploy.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Deploy to Selected ({selectedHostsForDeploy.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeployDialog;
