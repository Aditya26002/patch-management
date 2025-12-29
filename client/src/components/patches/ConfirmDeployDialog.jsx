import React from "react";

function ConfirmDeployDialog({
  show,
  currentPatch,
  selectedHostsForDeploy,
  hosts,
  onClose,
  onConfirm,
}) {
  if (!show || !currentPatch) return null;

  const selectedHosts = hosts.filter((h) =>
    selectedHostsForDeploy.includes(h._id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Confirm Deployment
          </h3>
        </div>

        {/* Patch Details Card */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="mb-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Patch Name
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {currentPatch.patchName || currentPatch.name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              ID: {currentPatch.patchId}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-300 dark:border-gray-600">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Category
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {currentPatch.category}
              </p>
            </div>
            {currentPatch.severity && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Severity
                </p>
                <p
                  className={`text-sm font-medium ${
                    currentPatch.severity === "Critical"
                      ? "text-red-600 dark:text-red-400"
                      : currentPatch.severity === "Important"
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  {currentPatch.severity}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Target Hosts */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Target Hosts ({selectedHosts.length}):
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            {selectedHosts.map((host) => (
              <div
                key={host._id}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <svg
                  className="w-4 h-4 text-green-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className="font-medium">{host.ip}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                    ({host.osName})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
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
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                Important Notice
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Deployment may take several minutes. Hosts may reboot
                automatically if required by the patch.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Message */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to deploy this patch to{" "}
          <strong>{selectedHosts.length}</strong> selected host(s)?
        </p>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            Confirm & Deploy
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeployDialog;
