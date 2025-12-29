import React from "react";

function AddDeviceDialog({
  show,
  newDevice,
  ipError,
  osOptions,
  groups,
  selectedGroups,
  onIPChange,
  onOSNameChange,
  onOSVersionChange,
  onGroupSelectionChange,
  onClose,
  onAdd,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full border border-gray-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add New Device
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter host details to add to the system
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IP Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., 192.168.1.50"
              value={newDevice.ip}
              onChange={onIPChange}
              className={`w-full px-3 py-2 border ${
                ipError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-orange-500"
              } rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent placeholder:text-xs text-xs`}
            />
            {ipError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {ipError}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center gap-4 placeholder:text-xs">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OS Name <span className="text-red-500">*</span>
              </label>
              <select
                value={newDevice.osName}
                onChange={onOSNameChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-xs"
              >
                <option value="">Select OS</option>
                {Object.keys(osOptions).map((os) => (
                  <option key={os} value={os}>
                    {os}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OS Version <span className="text-red-500">*</span>
              </label>
              <select
                value={newDevice.osVersion}
                onChange={onOSVersionChange}
                disabled={!newDevice.osName}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <option value="">
                  {newDevice.osName ? "Select Version" : "Select OS Name first"}
                </option>
                {newDevice.osName &&
                  osOptions[newDevice.osName].map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Login ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., root, admin"
              value={newDevice.loginId}
              onChange={(e) =>
                onOSVersionChange({
                  target: { name: "loginId", value: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs"
              name="loginId"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={newDevice.password}
              onChange={(e) =>
                onOSVersionChange({
                  target: { name: "password", value: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              name="password"
            />
          </div>

          {newDevice.osName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add to Groups (Optional)
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {groups.filter((group) => group.os === newDevice.osName)
                  .length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No custom groups available for {newDevice.osName}
                  </p>
                ) : (
                  groups
                    .filter((group) => group.os === newDevice.osName)
                    .map((group) => (
                      <div
                        key={group._id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <input
                          type="checkbox"
                          id={`group-${group._id}`}
                          checked={selectedGroups.includes(group._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onGroupSelectionChange([
                                ...selectedGroups,
                                group._id,
                              ]);
                            } else {
                              onGroupSelectionChange(
                                selectedGroups.filter((id) => id !== group._id)
                              );
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500"
                        />
                        <label
                          htmlFor={`group-${group._id}`}
                          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          {group.name}
                        </label>
                      </div>
                    ))
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Host will be automatically added to the default{" "}
                {newDevice.osName} group
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Add Host
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddDeviceDialog;
