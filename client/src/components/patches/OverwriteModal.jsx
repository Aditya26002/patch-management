import React from "react";

function OverwriteModal({ show, filename, onCancel, onConfirm }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="rounded-lg p-8 max-w-md w-full mx-4 bg-white dark:bg-gray-800">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          File Already Exists
        </h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          The file{" "}
          <span className="font-semibold text-blue-600">"{filename}"</span>{" "}
          already exists in the upload directory.
        </p>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Do you want to overwrite it?
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  );
}

export default OverwriteModal;
