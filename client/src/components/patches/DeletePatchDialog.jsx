import { useState } from "react";

function DeletePatchDialog({ show, patch, onClose, onConfirm }) {
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!show || !patch) return null;

  const handleConfirm = async () => {
    // Validate input matches patch ID or patch name
    if (confirmInput !== patch.patchId && confirmInput !== patch.name) {
      alert(
        "Confirmation text does not match. Please enter the exact Patch ID or Patch Name."
      );
      return;
    }

    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    setConfirmInput("");
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmInput("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full border border-red-300 dark:border-red-600">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
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
            <div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
                Delete Patch
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">
              ⚠️ This action will delete the patch permanently
            </p>
            <p className="text-red-700 dark:text-red-300 text-sm mt-2">
              The patch will be removed from:
            </p>
            <ul className="list-disc list-inside text-red-700 dark:text-red-300 text-sm mt-1 ml-2">
              <li>Database</li>
              <li>File system</li>
              <li>All deployment records</li>
            </ul>
          </div>

          {/* Patch Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Patch Details:
            </h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-800 dark:text-gray-200">
                <span className="font-medium">ID:</span> {patch.patchId}
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                <span className="font-medium">Name:</span> {patch.name}
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                <span className="font-medium">File:</span> {patch.fileName}
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                <span className="font-medium">OS:</span>{" "}
                {Array.isArray(patch.affectedOS)
                  ? patch.affectedOS.join(", ")
                  : patch.affectedOS}
              </p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To confirm deletion, type the <strong>Patch ID</strong> or{" "}
              <strong>Patch Name</strong>:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`Enter "${patch.patchId}" or "${patch.name}"`}
              disabled={isDeleting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              isDeleting ||
              (confirmInput !== patch.patchId && confirmInput !== patch.name)
            }
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeletePatchDialog;
