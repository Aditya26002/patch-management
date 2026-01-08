import AdminNavbar from "../components/navbar/AdminNavbar";
import { useState, useEffect, useMemo, useRef } from "react";
import CreateGroupDialog from "../components/groups/CreateGroupDialog";
import GroupDetailsDialog from "../components/groups/GroupDetailsDialog";
import GroupSelectivePatchDialog from "../components/groups/GroupSelectivePatchDialog";
import Toast from "../components/common/Toast";
import LoadingOverlay from "../components/common/LoadingOverlay";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TYPE_OPTIONS = [
  { label: "All Groups", value: "" },
  { label: "Default Groups", value: "default" },
  { label: "Custom Groups", value: "custom" },
];

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showOSFilter, setShowOSFilter] = useState(false);
  const [selectedOS, setSelectedOS] = useState("");
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [totalGroups, setTotalGroups] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(null); // group id or null
  const [editingGroup, setEditingGroup] = useState(null); // group object or null
  const [error, setError] = useState(null);
  const [showSelectivePatchDialog, setShowSelectivePatchDialog] =
    useState(false);
  const [selectedGroupForPatch, setSelectedGroupForPatch] = useState(null);
  const [resultMessage, setResultMessage] = useState(null);

  const osFilterRef = useRef(null);
  const typeFilterRef = useRef(null);
  const groupsPerPage = 25;

  const formatTimestamp = (timestamp) =>
    timestamp
      ? new Date(timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedOS, selectedType]);

  // Fetch groups from API
  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: currentPage,
        limit: groupsPerPage,
      });
      if (selectedOS) params.append("os", selectedOS);
      if (selectedType) params.append("type", selectedType);

      const response = await fetch(
        `${API_BASE_URL}/groups?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setGroups(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalGroups(data.pagination?.totalGroups || 0);
      } else {
        setError(data.message || "Failed to fetch groups");
      }
    } catch (err) {
      setError("Failed to fetch groups");
      console.error("Error fetching groups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (osFilterRef.current && !osFilterRef.current.contains(event.target)) {
        setShowOSFilter(false);
      }
      if (
        typeFilterRef.current &&
        !typeFilterRef.current.contains(event.target)
      ) {
        setShowTypeFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => {
      const fields = [
        group.name,
        group.os,
        group.isDefault ? "default" : "custom",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [searchQuery, groups]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedOS("");
    setSelectedType("");
    setCurrentPage(1);
  };

  const handleSaveGroup = async (groupData) => {
    try {
      const isEditing = !!editingGroup;
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `${API_BASE_URL}/groups/${editingGroup.id}`
        : `${API_BASE_URL}/groups`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchGroups(); // Refresh the list
        setShowCreateDialog(false);
        setEditingGroup(null);
      } else {
        alert(
          data.message || `Failed to ${isEditing ? "update" : "create"} group`
        );
      }
    } catch (err) {
      console.error(
        `Error ${editingGroup ? "updating" : "creating"} group:`,
        err
      );
      alert(`Failed to ${editingGroup ? "update" : "create"} group`);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchGroups(); // Refresh the list
      } else {
        alert(data.message || "Failed to delete group");
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Failed to delete group");
    }
  };

  const handleCloseDetails = () => {
    setShowDetailsDialog(null);
  };

  const handleViewDetails = (group) => {
    setShowDetailsDialog(group.id);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setShowCreateDialog(true);
  };

  const handleDeleteClick = (group) => {
    handleDeleteGroup(group.id);
  };

  const handleDeploySelectivePatches = (group) => {
    setSelectedGroupForPatch(group);
    setShowSelectivePatchDialog(true);
  };

  const handleConfirmSelectiveDeploy = async (groupId, selectedPatches) => {
    setIsLoading(true);
    setResultMessage({
      type: "processing",
      text: `Deploying selective patches to group. This may take several minutes...`,
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/groups/${groupId}/deploy-selective-patches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedPatches,
            performedBy: "admin",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Deployment failed");
      }

      const { success, failed, details } = data.data;

      setResultMessage({
        type: "success",
        text: `✅ Selective patch deployment complete! Success: ${success}, Failed: ${failed}`,
      });

      fetchGroups();
    } catch (error) {
      console.error("Selective deployment error:", error);
      setResultMessage({
        type: "error",
        text: error.message || "Failed to deploy selective patches",
      });
    } finally {
      setIsLoading(false);
      setShowSelectivePatchDialog(false);
      setSelectedGroupForPatch(null);
    }
  };

  const selectedGroup = groups.find((g) => g.id === showDetailsDialog);

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminNavbar />
        <div className="px-[4%] py-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <div className="px-[4%] py-6 space-y-4">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-2xl">
                <input
                  type="text"
                  placeholder="Search by group name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 max-w-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs placeholder:tracking-wide"
                />
                <div className="relative" ref={osFilterRef}>
                  <button
                    onClick={() => setShowOSFilter(!showOSFilter)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs"
                  >
                    <span>{selectedOS ? `OS: ${selectedOS}` : "All OS"}</span>
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showOSFilter && (
                    <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2">
                      <button
                        onClick={() => {
                          setSelectedOS("");
                          setShowOSFilter(false);
                          setCurrentPage(1);
                        }}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      >
                        All OS
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOS("Linux");
                          setShowOSFilter(false);
                          setCurrentPage(1);
                        }}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      >
                        Linux
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOS("Windows");
                          setShowOSFilter(false);
                          setCurrentPage(1);
                        }}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      >
                        Windows
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative" ref={typeFilterRef}>
                  <button
                    onClick={() => setShowTypeFilter(!showTypeFilter)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs"
                  >
                    <span>
                      {selectedType ? `Type: ${selectedType}` : "All Types"}
                    </span>
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
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showTypeFilter && (
                    <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-2">
                      <div className="py-1">
                        {TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value || "all"}
                            onClick={() => {
                              setSelectedType(opt.value);
                              setCurrentPage(1);
                              setShowTypeFilter(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              selectedType === opt.value
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {(searchQuery || selectedOS || selectedType) && (
                <div className="flex items-center gap-2 ">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Active filters:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                        Search: {searchQuery}
                      </span>
                    )}
                    {selectedOS && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                        OS: {selectedOS}
                      </span>
                    )}
                    {selectedType && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                        Type: {selectedType}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="ml-auto px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
            <button
              className="px-2 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 text-xs"
              onClick={() => setShowCreateDialog(true)}
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Group
            </button>
          </div>
        </div>

        {/* Groups Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm border-b border-gray-300 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold tracking-wider">
                    S.No.
                  </th>
                  <th className="px-4 py-2 text-left font-semibold tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-2 text-center font-semibold tracking-wider">
                    OS
                  </th>
                  <th className="px-4 py-2 text-center font-semibold tracking-wider">
                    Hosts
                  </th>
                  <th className="px-4 py-2 text-center font-semibold tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2 text-center font-semibold tracking-wider">
                    Created At
                  </th>
                  <th className="px-4 py-2 text-center font-semibold tracking-wider">
                    Updated At
                  </th>
                  <th className="px-4 py-2 text-center font-semibold tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="animate-spin h-8 w-8 text-orange-500"
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
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400">
                          Loading groups...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400">
                          No groups found
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group, index) => (
                    <tr
                      key={group.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-1 text-xs text-left text-gray-900 dark:text-white">
                        {(currentPage - 1) * groupsPerPage + index + 1}.
                      </td>
                      <td
                        className="px-4 py-1 text-xs text-left font-medium cursor-pointer text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={() => setShowDetailsDialog(group.id)}
                      >
                        {group.name}
                      </td>
                      <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white capitalize">
                        {group.os}
                      </td>
                      <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                        {group.hosts.length}
                      </td>
                      <td className="px-4 py-1 text-xs text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            group.isDefault
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                          }`}
                        >
                          {group.isDefault ? "Default" : "Custom"}
                        </span>
                      </td>
                      <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                        {formatTimestamp(group.createdAt)}
                      </td>
                      <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                        {formatTimestamp(group.updatedAt)}
                      </td>
                      <td className="px-4 py-1 text-xs text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setShowDetailsDialog(group.id)}
                            className="px-2 py-1 bg-orange-500 cursor-pointer text-white rounded-lg hover:bg-orange-600 transition-colors text-xs"
                          >
                            Details
                          </button>
                          {!group.isDefault && (
                            <>
                              <button
                                onClick={() => setEditingGroup(group)}
                                className="px-2 py-1 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(group.id)}
                                className="px-2 py-1 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-xs"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeploySelectivePatches(group)}
                            disabled={group.hosts.length === 0}
                            className="px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Deploy Patches
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredGroups.length > 0 && (
            <div className="px-4 py-1 flex items-center justify-between border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
              <div className="text-gray-700 dark:text-gray-300">
                Showing{" "}
                <span className="font-semibold">
                  {(currentPage - 1) * groupsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold">
                  {Math.min(currentPage * groupsPerPage, totalGroups)}
                </span>{" "}
                of <span className="font-semibold">{totalGroups}</span> groups
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-1 py-1 text-xs text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <CreateGroupDialog
          show={showCreateDialog || !!editingGroup}
          onClose={() => {
            setShowCreateDialog(false);
            setEditingGroup(null);
          }}
          onCreate={handleSaveGroup}
          groupToEdit={editingGroup}
        />
        <GroupDetailsDialog
          show={!!showDetailsDialog}
          group={selectedGroup}
          onClose={handleCloseDetails}
        />
        <GroupSelectivePatchDialog
          show={showSelectivePatchDialog}
          group={selectedGroupForPatch}
          onClose={() => {
            setShowSelectivePatchDialog(false);
            setSelectedGroupForPatch(null);
          }}
          onDeploy={handleConfirmSelectiveDeploy}
        />
        {resultMessage && (
          <Toast
            message={resultMessage.text}
            type={resultMessage.type}
            onClose={() => setResultMessage(null)}
          />
        )}
        {isLoading && <LoadingOverlay message="Processing..." />}
      </div>
    </div>
  );
}

export default GroupsPage;
