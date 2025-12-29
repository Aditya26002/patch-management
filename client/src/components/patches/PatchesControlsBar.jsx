import React, { useState, useRef, useEffect } from "react";

function PatchesControlsBar({
  searchQuery,
  onSearchChange,
  showOSFilter,
  selectedOSFilters,
  onToggleOSFilter,
  onClearOSFilters,
  availableOS,
  showCategoryFilter,
  onToggleCategoryFilter,
  selectedCategoryFilters,

  showStatusFilter,
  onToggleStatusFilter,
  selectedStatusFilters,

  onClearAllFilters,
  onAddPatchClick,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  availableCategories,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const osFilterRef = useRef(null);
  const categoryFilterRef = useRef(null);
  const statusFilterRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (osFilterRef.current && !osFilterRef.current.contains(event.target)) {
        onToggleOSFilter(false);
      }
      if (
        categoryFilterRef.current &&
        !categoryFilterRef.current.contains(event.target)
      ) {
        onToggleCategoryFilter(false);
      }
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target)
      ) {
        onToggleStatusFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onToggleOSFilter, onToggleCategoryFilter, onToggleStatusFilter]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 mb-4">
      <div className="flex items-center justify-between">
        {/* Search and Filters */}
        <div className="flex items-center gap-3 flex-1 max-w-4xl flex-wrap">
          <input
            type="text"
            placeholder="Search by patch ID or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 min-w-[250px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs placeholder:tracking-wide"
          />

          {/* OS Filter */}
          <div className="relative" ref={osFilterRef}>
            <button
              onClick={() => onToggleOSFilter(!showOSFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
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
              OS
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
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative" ref={categoryFilterRef}>
            <button
              onClick={() => onToggleCategoryFilter(!showCategoryFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Category
              {selectedCategoryFilters.length > 0 && (
                <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                  {selectedCategoryFilters.length}
                </span>
              )}
            </button>

            {showCategoryFilter && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Select Category
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {availableCategories.map((category) => (
                    <label
                      key={category}
                      className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategoryFilters.includes(category)}
                        onChange={() => onToggleCategoryFilter(category)}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                        {category}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative" ref={statusFilterRef}>
            <button
              onClick={() => onToggleStatusFilter(!showStatusFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs whitespace-nowrap"
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Status
              {selectedStatusFilters.length > 0 && (
                <span className="bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold">
                  {selectedStatusFilters.length}
                </span>
              )}
            </button>

            {showStatusFilter && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Select Status
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {[
                    { value: "available", label: "Available" },
                    {
                      value: "partially-deployed",
                      label: "Partially Deployed",
                    },
                    { value: "fully-deployed", label: "Fully Deployed" },
                  ].map((status) => (
                    <label
                      key={status.value}
                      className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatusFilters.includes(status.value)}
                        onChange={() => onToggleStatusFilter(status.value)}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clear All Filters */}
          {(selectedOSFilters.length > 0 ||
            selectedCategoryFilters.length > 0 ||
            selectedStatusFilters.length > 0) && (
            <button
              onClick={onClearAllFilters}
              className="px-3 py-2 text-xs text-orange-500 hover:text-orange-600 font-medium whitespace-nowrap"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Add Patch Button */}
          <button
            onClick={onAddPatchClick}
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
            Add Patch
          </button>

          {/* Export Button */}
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
        </div>
      </div>
    </div>
  );
}

export default PatchesControlsBar;
