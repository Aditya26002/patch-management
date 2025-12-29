import React from "react";

function DeleteDialog({
  show,
  hostToDelete,
  deletePassword,
  deleteError,
  isDeleting,
  onClose,
  onPasswordChange,
  onConfirmDelete,
}) {
  if (!show || !hostToDelete) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full border border-gray-300 dark:border-gray-600">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Delete Host
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            This action cannot be undone
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">
              Are you sure you want to delete <strong>{hostToDelete.ip}</strong>
              ?
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              disabled={isDeleting}
              className={`w-full px-3 py-2 border ${
                deleteError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-orange-500"
              } rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {deleteError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {deleteError}
              </p>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-xs">
              ⚠️ Deleting this host will remove all associated records from the
              system.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmDelete}
            disabled={!deletePassword || isDeleting}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Deleting...
              </>
            ) : (
              "Delete Host"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDialog;
