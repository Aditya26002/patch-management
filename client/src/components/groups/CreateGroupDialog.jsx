import React, { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function CreateGroupDialog({ show, onClose, onCreate, groupToEdit }) {
  const [groupName, setGroupName] = useState("");
  const [selectedOS, setSelectedOS] = useState("");
  const [selectedHosts, setSelectedHosts] = useState([]);
  const [availableHosts, setAvailableHosts] = useState([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);

  useEffect(() => {
    if (groupToEdit) {
      setGroupName(groupToEdit.name);
      setSelectedOS(groupToEdit.os);
      setSelectedHosts(groupToEdit.hosts.map((h) => h._id));
    } else {
      setGroupName("");
      setSelectedOS("");
      setSelectedHosts([]);
    }
  }, [groupToEdit]);

  useEffect(() => {
    const fetchHosts = async () => {
      if (!selectedOS) {
        setAvailableHosts([]);
        return;
      }

      try {
        setIsLoadingHosts(true);
        const response = await fetch(`${API_BASE_URL}/hosts`);
        const data = await response.json();

        if (data.success) {
          const filtered = data.data.filter(
            (host) => host.osName === selectedOS
          );
          setAvailableHosts(filtered);
        }
      } catch (error) {
        console.error("Error fetching hosts:", error);
      } finally {
        setIsLoadingHosts(false);
      }
    };

    fetchHosts();
  }, [selectedOS]);

  const handleHostToggle = (hostId) => {
    setSelectedHosts((prev) =>
      prev.includes(hostId)
        ? prev.filter((id) => id !== hostId)
        : [...prev, hostId]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || !selectedOS || selectedHosts.length === 0) {
      return;
    }
    const groupData = {
      name: groupName.trim(),
      os: selectedOS,
      hostIds: selectedHosts,
    };
    onCreate(groupData);
    // Reset form
    setGroupName("");
    setSelectedOS("");
    setSelectedHosts([]);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-300 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {groupToEdit ? "Edit Group" : "Create New Group"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {groupToEdit
              ? "Update group details"
              : "Create a custom group for organizing hosts"}
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Production Servers"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operating System <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOS}
              onChange={(e) => setSelectedOS(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select OS</option>
              <option value="Windows">Windows</option>
              <option value="Linux">Linux</option>
            </select>
          </div>

          {selectedOS && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Hosts <span className="text-red-500">*</span>
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {isLoadingHosts ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Loading hosts...
                  </p>
                ) : availableHosts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No hosts available for {selectedOS}
                  </p>
                ) : (
                  availableHosts.map((host) => (
                    <div
                      key={host._id}
                      className="flex items-center space-x-2 py-1"
                    >
                      <input
                        type="checkbox"
                        id={`host-${host._id}`}
                        checked={selectedHosts.includes(host._id)}
                        onChange={() => handleHostToggle(host._id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500"
                      />
                      <label
                        htmlFor={`host-${host._id}`}
                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        {host.ip} ({host.osName} {host.osVersion})
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: {selectedHosts.length} hosts
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
            onClick={handleCreate}
            disabled={
              !groupName.trim() || !selectedOS || selectedHosts.length === 0
            }
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {groupToEdit ? "Update Group" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupDialog;
