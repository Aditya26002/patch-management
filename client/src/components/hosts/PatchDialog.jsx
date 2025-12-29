import React from "react";

function PatchDialog({
  show,
  currentDevice,
  availablePatches,
  selectedPatches,
  isDeploying,
  showConfirmUpdate,
  onClose,
  onTogglePatch,
  onToggleAll,
  onUpdateClick,
  onConfirmedUpdate,
  onCancelConfirm,
}) {
  if (!show || !currentDevice) return null;

  const allSelected =
    availablePatches.length > 0 &&
    selectedPatches.length === availablePatches.length;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {!showConfirmUpdate ? (
          <>
            {/* Patch Selection View */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Available Patches for {currentDevice.ip}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentDevice.osName} {currentDevice.osVersion}
              </p>
            </div>

            <div className="px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={onToggleAll}
                disabled={isDeploying || availablePatches.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500 pointer-events-none"
                />
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {availablePatches.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-600 dark:text-gray-400">
                    No patches available for this host
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availablePatches.map((patch) => (
                    <div
                      key={patch._id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPatches.includes(patch._id)}
                          onChange={() => onTogglePatch(patch._id)}
                          disabled={isDeploying}
                          className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {patch.name}
                          </h3>
                          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">
                                Current Version:
                              </p>
                              <p className="text-gray-900 dark:text-white font-medium">
                                {patch.currentVersion}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">
                                New Version:
                              </p>
                              <p className="text-gray-900 dark:text-white font-medium">
                                {patch.newVersion}
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedPatches.length} of {availablePatches.length} patches
                selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isDeploying}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
                <button
                  onClick={onUpdateClick}
                  disabled={
                    selectedPatches.length === 0 ||
                    isDeploying ||
                    availablePatches.length === 0
                  }
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeploying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deploying...
                    </>
                  ) : (
                    `Update (${selectedPatches.length})`
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation View */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Confirm Update
              </h2>
            </div>

            <div className="p-6 flex-1">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Host:</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {currentDevice.ip}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">OS:</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {currentDevice.osName} {currentDevice.osVersion}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Patches to Install ({selectedPatches.length}):
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availablePatches
                      .filter((p) => selectedPatches.includes(p._id))
                      .map((patch) => (
                        <div
                          key={patch._id}
                          className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm text-gray-900 dark:text-white"
                        >
                          {patch.name} ({patch.currentVersion} →{" "}
                          {patch.newVersion})
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ The host will be rebooted if required by the patches.
                    Proceed with caution in production environments.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={onCancelConfirm}
                disabled={isDeploying}
                className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmedUpdate}
                disabled={isDeploying}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Installing...
                  </>
                ) : (
                  "Proceed with Update"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PatchDialog;
