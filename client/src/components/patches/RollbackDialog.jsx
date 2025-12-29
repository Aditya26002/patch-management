import React from "react";

function RollbackDialog({
  show,
  currentPatch,
  deployedHosts,
  onClose,
  onConfirm,
}) {
  if (!show || !currentPatch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Rollback Patch: {currentPatch.patchId}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            This patch will be rolled back from the following hosts
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Patch Details:
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {currentPatch.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Category: {currentPatch.category} | OS:{" "}
              {currentPatch.affectedOS.join(", ")}
            </p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Deployed Hosts ({deployedHosts.length}):
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {deployedHosts.map((host) => (
                <div
                  key={host._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {host.ip}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {host.osName} {host.osVersion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {deployedHosts.length === 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No hosts found with this patch installed.
                </p>
              )}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              Warning: This action will uninstall the patch from all hosts where
              it has been deployed.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Rollback from All
          </button>
        </div>
      </div>
    </div>
  );
}

export default RollbackDialog;
