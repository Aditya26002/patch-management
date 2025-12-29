import React from "react";

function PatchesTable({
  currentPatches,
  startIndex,
  patchesPerPage,
  filteredPatches,
  currentPage,
  totalPages,
  onDeploy,
  onRollback,
  onDelete,
  getPatchStatus,
  isNewPatch,
  getTimeAgo,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm">
            <tr>
              <th className="px-4 py-2 text-left tracking-wider font-semibold">
                S.No.
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Patch ID
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Patch Name
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Release Date
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Affected OS
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Category
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Status
              </th>
              <th className="px-4 py-2 text-center tracking-wider font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentPatches.map((patch, index) => {
              const status = getPatchStatus(patch);
              const isDeployed = (patch.installedOnHosts?.length || 0) > 0;
              const isFullyDeployed = status.type === "fully-deployed";
              const showNewBadge = isNewPatch(patch);

              return (
                <tr
                  key={patch._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-4 py-2 text-xs text-left text-gray-900 dark:text-white">
                    {startIndex + index + 1}.
                  </td>
                  <td className="px-4 py-2 text-xs text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-blue-500 font-medium">
                        {patch.patchId}
                      </span>
                      {/* NEW Badge */}
                      {showNewBadge && (
                        <span className="relative inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg animate-pulse">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                              clipRule="evenodd"
                            />
                          </svg>
                          NEW
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        </span>
                      )}
                    </div>
                    {/* Upload Time */}
                    {showNewBadge && (
                      <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                        Uploaded {getTimeAgo(patch.createdAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-center text-gray-900 dark:text-white">
                    {patch.name}
                  </td>
                  <td className="px-4 py-2 text-xs text-center text-gray-900 dark:text-white">
                    {new Date(patch.releaseDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 text-xs text-center text-gray-900 dark:text-white">
                    {patch.affectedOS.join(", ")}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        patch.category === "Security"
                          ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                          : patch.category === "Feature Update"
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                      }`}
                    >
                      {patch.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        status.type === "available"
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          : status.type === "fully-deployed"
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                      }`}
                    >
                      {status.text}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onDeploy(patch)}
                        disabled={isFullyDeployed}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isFullyDeployed
                            ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        Deploy
                      </button>
                      <button
                        onClick={() => onRollback(patch)}
                        disabled={!isDeployed}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          !isDeployed
                            ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                      >
                        Rollback
                      </button>
                      <button
                        onClick={() => onDelete(patch)}
                        className="px-3 py-1 rounded-lg text-xs font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
                        title="Delete Patch"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-1 flex items-center justify-between border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
        <div className="text-xs text-gray-700 dark:text-gray-300">
          Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
          <span className="font-semibold">
            {Math.min(startIndex + patchesPerPage, filteredPatches.length)}
          </span>{" "}
          of <span className="font-semibold">{filteredPatches.length}</span>{" "}
          patches
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPrevPage}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="px-1 py-1 text-xs text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default PatchesTable;
