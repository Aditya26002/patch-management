function HostsTable({
  currentDevices,
  isBulkMode,
  selectedDevices,
  refreshingHostId,
  hostLastScanned,
  startIndex,
  devicesPerPage,
  filteredDevices,
  currentPage,
  totalPages,
  onSelectAll,
  onSelectDevice,
  onPatchClick,
  onRefreshScan,
  onDeleteClick,
  getTimeAgo,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm border-b border-gray-300 dark:border-gray-600">
            <tr>
              {isBulkMode && (
                <th className="px-4 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                      currentDevices.length > 0 &&
                      currentDevices.every((d) =>
                        selectedDevices.includes(d.id)
                      )
                    }
                    onChange={onSelectAll}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                </th>
              )}
              <th className="px-4 py-2 text-left font-semibold tracking-wider">
                S.No.
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                Host
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                OS Name
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                OS Version
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                Last Updated
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                Last Scanned
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                Updates Available
              </th>
              <th className="px-4 py-2 text-center font-semibold tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
            {currentDevices.map((device, index) => (
              <tr
                key={device.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {isBulkMode && (
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => onSelectDevice(device.id)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                  </td>
                )}

                <td className="px-4 py-2 text-xs text-left text-gray-900 dark:text-white">
                  {startIndex + index + 1}.
                </td>

                <td className="px-4 py-1 text-xs text-center text-blue-500 font-medium">
                  {device.ip}
                </td>

                <td className="px-4 py-2 text-xs text-center text-gray-900 dark:text-white">
                  {device.osName}
                </td>

                <td className="px-4 py-2 text-xs text-center text-gray-900 dark:text-white">
                  {device.osVersion}
                </td>

                <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  {new Date(device.lastPatched).toLocaleDateString()}
                </td>

                <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  {(hostLastScanned[device.id] || device.lastPatched) && (
                    <div>
                      {getTimeAgo(
                        hostLastScanned[device.id] || device.lastPatched
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {device.patchCount > 0 ? (
                      <button
                        onClick={() => onPatchClick(device)}
                        className="px-2 py-1 bg-orange-500 cursor-pointer text-white rounded-lg hover:bg-orange-600 transition-colors text-xs"
                      >
                        {device.patchCount} Available
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed text-xs"
                      >
                        Up to date
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-4 py-1 text-xs text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onRefreshScan(device)}
                      disabled={refreshingHostId === device.id}
                      className="px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-lg shadow-lg hover:shadow-xl hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Refresh scan"
                    >
                      {refreshingHostId === device.id ? (
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => onDeleteClick(device)}
                      className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-lg shadow-lg hover:shadow-xl hover:bg-red-600 transition-all cursor-pointer"
                      title="Delete host"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-1 flex items-center justify-between border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
        <div>
          Showing{" "}
          <span className="font-semibold">
            {filteredDevices.length === 0 ? 0 : startIndex + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold">
            {Math.min(startIndex + devicesPerPage, filteredDevices.length)}
          </span>{" "}
          of <span className="font-semibold">{filteredDevices.length}</span>{" "}
          hosts
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={onPrevPage}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-1 py-1 text-xs">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default HostsTable;
