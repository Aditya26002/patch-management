import React from "react";

function AddPatchDialog({
  show,
  newPatch,
  severityOptions,
  categoryOptions,
  isUploading,
  uploadProgress,
  onPatchIdChange,
  onPatchNameChange,
  onDescriptionChange,
  onSeverityChange,
  onApplicableOSChange,
  onReleaseDateChange,
  onCategoryChange,
  onFileChange,
  onClose,
  onAdd,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-xl w-full border border-gray-300">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add New Patch
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Enter patch details to add to the system
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Patch ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Patch ID *
              </label>
              <input
                type="text"
                placeholder="e.g., KB5001234"
                value={newPatch.patchId}
                onChange={onPatchIdChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity *
              </label>
              <select
                value={newPatch.severity}
                onChange={onSeverityChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select Severity</option>
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Patch Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Patch Name * (Auto-filled from file)
            </label>
            <input
              type="text"
              placeholder="e.g., Windows Security Update - November 2024"
              value={newPatch.patchName}
              onChange={onPatchNameChange}
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Patch name is automatically set from the uploaded filename
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              placeholder="Patch description..."
              value={newPatch.description}
              onChange={onDescriptionChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Applicable OS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Applicable OS *
            </label>
            <select
              value={newPatch.applicableOS}
              onChange={onApplicableOSChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select OS</option>
              <option value="Windows">Windows</option>
              <option value="Linux">Linux</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Release Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Release Date *
              </label>
              <input
                type="date"
                value={newPatch.releaseDate}
                onChange={onReleaseDateChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={newPatch.category}
                onChange={onCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Patch File *
              {newPatch.applicableOS === "Windows" && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  (Windows: .exe, .msi, .wsi)
                </span>
              )}
              {newPatch.applicableOS === "Linux" && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                  (Linux: .deb, .rpm, .tar.gz, .tgz, .tar.bz2, .tar.xz, .sh,
                  .bin, .run, .appimage)
                </span>
              )}
              {!newPatch.applicableOS && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  (Select OS first)
                </span>
              )}
            </label>
            <input
              type="file"
              accept=".exe,.msi,.wsi,.deb,.rpm,.tar.gz,.tgz,.tar.bz2,.tar.xz,.sh,.bin,.run,.appimage"
              onChange={onFileChange}
              required
              disabled={!newPatch.applicableOS}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {newPatch.patchFile && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {newPatch.patchFile.name} (
                {(newPatch.patchFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            {!newPatch.applicableOS && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Please select Applicable OS before uploading a file
              </p>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="w-full">
              <div className="flex justify-between text-sm mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={isUploading}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Add Patch"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddPatchDialog;
