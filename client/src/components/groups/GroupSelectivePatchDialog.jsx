import React, { useState, useEffect } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function GroupSelectivePatchDialog({ show, group, onClose, onDeploy }) {
  const [loading, setLoading] = useState(false);
  const [hostPatches, setHostPatches] = useState({}); // { hostIP: { patches: [], selected: [] } }
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (show && group) {
      fetchPatchesForAllHosts();
    }
  }, [show, group]);

  const fetchPatchesForAllHosts = async () => {
    if (!group || !group.hosts || group.hosts.length === 0) return;

    setLoading(true);
    const patchesMap = {};

    for (const host of group.hosts) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/logs/scanlogs?hostIP=${host.ip}`
        );

        if (response.ok) {
          const scanLogData = await response.json();

          if (scanLogData?.updates && scanLogData.updates.length > 0) {
            const transformedUpdates = scanLogData.updates.map((update) => {
              let kbValue = update.kb;

              if (Array.isArray(kbValue) && kbValue.length > 0) {
                kbValue = kbValue[0];
              }

              if (kbValue && !kbValue.startsWith("KB")) {
                kbValue = `KB${kbValue}`;
              }

              return {
                ...update,
                kb: kbValue,
                _id: update._id || `${host.ip}_${kbValue}`,
              };
            });

            patchesMap[host.ip] = {
              hostId: host._id,
              osName: host.osName,
              osVersion: host.osVersion,
              patches: transformedUpdates,
              selected: [],
            };
          } else {
            patchesMap[host.ip] = {
              hostId: host._id,
              osName: host.osName,
              osVersion: host.osVersion,
              patches: [],
              selected: [],
            };
          }
        }
      } catch (error) {
        console.error(`Error fetching patches for ${host.ip}:`, error);
        patchesMap[host.ip] = {
          hostId: host._id,
          osName: host.osName,
          osVersion: host.osVersion,
          patches: [],
          selected: [],
          error: error.message,
        };
      }
    }

    setHostPatches(patchesMap);
    setLoading(false);
  };

  const togglePatchSelection = (hostIP, patchId) => {
    setHostPatches((prev) => {
      const hostData = prev[hostIP];
      const isSelected = hostData.selected.includes(patchId);

      return {
        ...prev,
        [hostIP]: {
          ...hostData,
          selected: isSelected
            ? hostData.selected.filter((id) => id !== patchId)
            : [...hostData.selected, patchId],
        },
      };
    });
  };

  const toggleSelectAllForHost = (hostIP) => {
    setHostPatches((prev) => {
      const hostData = prev[hostIP];
      const allPatchIds = hostData.patches.map((p) => p._id);
      const allSelected = hostData.selected.length === allPatchIds.length;

      return {
        ...prev,
        [hostIP]: {
          ...hostData,
          selected: allSelected ? [] : allPatchIds,
        },
      };
    });
  };

  const toggleSelectAllPatches = () => {
    const allSelected = Object.values(hostPatches).every(
      (host) => host.selected.length === host.patches.length
    );

    setHostPatches((prev) => {
      const updated = {};
      Object.entries(prev).forEach(([hostIP, hostData]) => {
        updated[hostIP] = {
          ...hostData,
          selected: allSelected ? [] : hostData.patches.map((p) => p._id),
        };
      });
      return updated;
    });
  };

  const getTotalSelectedCount = () => {
    return Object.values(hostPatches).reduce(
      (sum, host) => sum + host.selected.length,
      0
    );
  };

  const handleDeployClick = () => {
    if (getTotalSelectedCount() === 0) {
      alert("Please select at least one patch");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmDeploy = async () => {
    setShowConfirm(false);
    setIsDeploying(true);

    // Build selectedPatches object: { hostIP: [KB/package names] }
    const selectedPatches = {};
    Object.entries(hostPatches).forEach(([hostIP, hostData]) => {
      if (hostData.selected.length > 0) {
        // Get the actual KB or package names for selected patches
        const patchNames = hostData.patches
          .filter((p) => hostData.selected.includes(p._id))
          .map((p) => {
            if (group.osType === "Windows") {
              return p.kb || p.name || p.packageName;
            } else {
              return p.packageName || p.name || p.kb;
            }
          })
          .filter(Boolean);

        selectedPatches[hostIP] = patchNames;
      }
    });

    try {
      await onDeploy(group._id, selectedPatches);
      onClose();
    } catch (error) {
      console.error("Deployment failed:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!show || !group) return null;

  const totalSelected = getTotalSelectedCount();
  const totalAvailable = Object.values(hostPatches).reduce(
    (sum, host) => sum + host.patches.length,
    0
  );

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {!showConfirm ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Deploy Patches to Group: {group.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {group.osType} • {group.hosts.length} host(s)
              </p>
            </div>

            {/* Select All Button */}
            <div className="px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {totalSelected} of {totalAvailable} patches selected across all
                hosts
              </span>
              <button
                onClick={toggleSelectAllPatches}
                disabled={loading || isDeploying}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {totalSelected === totalAvailable && totalAvailable > 0
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Loading patches...
                  </span>
                </div>
              ) : Object.keys(hostPatches).length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-600 dark:text-gray-400">
                    No hosts found in this group
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(hostPatches).map(([hostIP, hostData]) => (
                    <div
                      key={hostIP}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      {/* Host Header */}
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {hostIP}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {hostData.osName} {hostData.osVersion}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleSelectAllForHost(hostIP)}
                          disabled={hostData.patches.length === 0}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50"
                        >
                          {hostData.selected.length ===
                            hostData.patches.length &&
                          hostData.patches.length > 0
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      </div>

                      {/* Patches List */}
                      {hostData.error ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Error: {hostData.error}
                        </p>
                      ) : hostData.patches.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No patches available for this host
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {hostData.patches.map((patch) => (
                            <div
                              key={patch._id}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hostData.selected.includes(
                                    patch._id
                                  )}
                                  onChange={() =>
                                    togglePatchSelection(hostIP, patch._id)
                                  }
                                  className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {patch.name ||
                                        patch.packageName ||
                                        patch.kb}
                                    </p>
                                  </div>
                                  {patch.currentVersion && patch.newVersion && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {patch.currentVersion} →{" "}
                                      {patch.newVersion}
                                    </p>
                                  )}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isDeploying}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeployClick}
                disabled={isDeploying || loading || totalSelected === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deploy Selected Patches
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation Dialog */}
            <div className="p-6 flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Confirm Deployment
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Group:
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {group.name}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Patches to Deploy: ({totalSelected} total)
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(hostPatches)
                      .filter(([_, hostData]) => hostData.selected.length > 0)
                      .map(([hostIP, hostData]) => (
                        <div
                          key={hostIP}
                          className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm"
                        >
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            {hostIP} ({hostData.selected.length} patches)
                          </p>
                          <div className="text-gray-600 dark:text-gray-400 text-xs">
                            {hostData.patches
                              .filter((p) => hostData.selected.includes(p._id))
                              .map((p) => p.name || p.packageName || p.kb)
                              .join(", ")}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ This will deploy the selected patches to all hosts in the
                    group. Some hosts may require a reboot. This process may
                    take several minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeploying}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleConfirmDeploy}
                disabled={isDeploying}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deploying...</span>
                  </>
                ) : (
                  <span>Confirm & Deploy</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GroupSelectivePatchDialog;
