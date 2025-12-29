import { useState, useRef, useEffect } from "react";

function ControlsBar({
  searchQuery,
  onSearchChange,
  isBulkMode,
  selectedDevicesCount,
  showOSFilter,
  selectedOSFilters,
  onToggleOSFilter,
  onClearOSFilters,
  availableOS,
  devices,
  onToggleBulkMode,
  onAddDeviceClick,
  onBulkUpdateClick,
  onExportCSV,
  onExportExcel,
  onExportPDF,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const osFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (osFilterRef.current && !osFilterRef.current.contains(event.target)) {
        onToggleOSFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onToggleOSFilter]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 mb-4">
      <div className="flex items-center justify-between">
        {/* Search and Filters */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          {/* Search Input */}
          <input
            autoComplete="off"
            type="text"
            placeholder="Search by host IP..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 max-w-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs placeholder:tracking-wide"
          />

          {/* OS Filter Dropdown */}
          <div className="relative" ref={osFilterRef}>
            <button
              onClick={() => onToggleOSFilter(!showOSFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              OS Filter
              {selectedOSFilters.length > 0 && (
                <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                  {selectedOSFilters.length}
                </span>
              )}
            </button>

            {showOSFilter && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Select OS
                  </span>
                  {selectedOSFilters.length > 0 && (
                    <button
                      onClick={onClearOSFilters}
                      className="text-xs text-orange-500 hover:text-orange-600"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {availableOS.map((osName) => (
                    <label
                      key={osName}
                      className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOSFilters.includes(osName)}
                        onChange={() => onToggleOSFilter(osName)}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                        {osName}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {devices.filter((d) => d.osName === osName).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected OS Filter Tags */}
          {selectedOSFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedOSFilters.map((osName) => (
                <span
                  key={osName}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs"
                >
                  {osName}
                  <button
                    onClick={() => onToggleOSFilter(osName)}
                    className="hover:text-orange-600 dark:hover:text-orange-300"
                  >
                    <svg
                      className="w-3 h-3 cursor-pointer"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {!isBulkMode ? (
            <>
              {/* Add Host Button */}
              <button
                onClick={onAddDeviceClick}
                className="px-2 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 text-xs"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Host
              </button>

              {/* Export Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 text-xs"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button
                      onClick={() => {
                        onExportPDF();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => {
                        onExportCSV();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={() => {
                        onExportExcel();
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Export as Excel
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Bulk Mode: Cancel Button */}
              <button
                onClick={() => onToggleBulkMode(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>

              {/* Bulk Mode: Update Button */}
              <button
                onClick={onBulkUpdateClick}
                disabled={selectedDevicesCount === 0}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Update Selected ({selectedDevicesCount})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlsBar;
