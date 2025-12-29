import { useState, useMemo, useRef, useEffect } from "react";
import AdminNavbar from "../components/navbar/AdminNavbar";
import HostsTable from "../components/hosts/HostsTable";
import ControlsBar from "../components/hosts/ControlsBar";
import AddDeviceDialog from "../components/hosts/AddDeviceDialog";
import PatchDialog from "../components/hosts/PatchDialog";
import DeleteDialog from "../components/hosts/DeleteDialog";
import BulkUpdateDialog from "../components/hosts/BulkUpdateDialog";
import Toast from "../components/common/Toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function HostsPage() {
  const [devices, setDevices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [showPatchDialog, setShowPatchDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [selectedPatches, setSelectedPatches] = useState([]);
  const [availablePatches, setAvailablePatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [showOSFilter, setShowOSFilter] = useState(false);
  const [selectedOSFilters, setSelectedOSFilters] = useState([]);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [refreshingHostId, setRefreshingHostId] = useState(null);
  const [hostLastScanned, setHostLastScanned] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hostToDelete, setHostToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [newDevice, setNewDevice] = useState({
    ip: "",
    osName: "",
    osVersion: "",
    loginId: "",
    password: "",
  });

  const [ipError, setIpError] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  const osOptions = {
    Windows: [
      "Windows 10",
      "Windows 11",
      "Windows Server 2016",
      "Windows Server 2019",
      "Windows Server 2022",
    ],
    Linux: [
      "Ubuntu 20.04",
      "Ubuntu 22.04",
      "Ubuntu 24.04",
      "CentOS 7",
      "CentOS 8",
      "RHEL 8",
      "RHEL 9",
      "Debian 11",
      "Debian 12",
    ],
  };

  const osFilterRef = useRef(null);
  const devicesPerPage = 25;

  const validateIP = (ip) => {
    const ipPattern =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip);
  };

  const handleIPChange = (e) => {
    const value = e.target.value;
    setNewDevice({ ...newDevice, ip: value });

    if (value === "") {
      setIpError("");
    } else if (!validateIP(value)) {
      setIpError("Invalid IP address format");
    } else {
      setIpError("");
    }
  };

  const handleOSNameChange = (e) => {
    const selectedOS = e.target.value;
    setNewDevice({
      ...newDevice,
      osName: selectedOS,
      osVersion: "",
    });
  };

  const handleOSVersionChange = (e) => {
    const { name, value } = e.target;
    setNewDevice((prev) => ({ ...prev, [name || "osVersion"]: value }));
  };

  useEffect(() => {
    fetchDevices();
    fetchGroups();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hosts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.success) {
        const transformedDevices = data.data.map((host) => ({
          id: host._id,
          ip: host.ip,
          osName: host.osName,
          osVersion: host.osVersion,
          lastPatched: host.updatedAt,
          patchCount: host.patchCount || 0,
          patchesAvailable: [],
          loginId: host.loginId,
        }));
        setDevices(transformedDevices);
      }
    } catch (err) {
      console.error("Error fetching hosts:", err);
      setResultMessage({
        type: "error",
        message: "Failed to load hosts from database",
      });
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        // Filter out default groups, only show custom groups
        const customGroups = data.data.filter((group) => !group.isDefault);
        setGroups(customGroups);
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return "Never";

    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleRefreshScan = async (device) => {
    setRefreshingHostId(device.id);

    try {
      console.log(`[Refresh Scan] Starting scan for ${device.ip}`);

      const response = await fetch(
        `${API_BASE_URL}/hosts/${device.id}/scanafterpatchdeployed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      console.log(`[Refresh Scan] Response:`, data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to scan host");
      }

      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.id === device.id
            ? {
                ...d,
                patchCount: data.data.patchCount,
                lastPatched: data.data.lastScanned,
              }
            : d
        )
      );

      setHostLastScanned((prev) => ({
        ...prev,
        [device.id]: new Date(),
      }));

      setResultMessage({
        type: "success",
        message: `✅ Scan completed for ${device.ip}. Found ${data.data.patchCount} available patches.`,
      });

      if (showPatchDialog && currentDevice && currentDevice.id === device.id) {
        console.log(`[Refresh Scan] Auto-refreshing patch dialog...`);
        await handlePatchClick(device);
      }
    } catch (error) {
      console.error(`[Refresh Scan] Error:`, error);
      setResultMessage({
        type: "error",
        message: `Scan failed for ${device.ip}`,
      });
    } finally {
      setRefreshingHostId(null);
    }
  };

  const handleAddDevice = async () => {
    if (
      !newDevice.ip ||
      !newDevice.osName ||
      !newDevice.osVersion ||
      !newDevice.loginId ||
      !newDevice.password
    ) {
      setResultMessage({
        type: "error",
        message: "Please fill in all fields",
      });
      return;
    }

    if (!validateIP(newDevice.ip)) {
      setResultMessage({
        type: "error",
        message: "Please enter a valid IP address",
      });
      return;
    }

    setShowAddDeviceDialog(false);
    setIsLoading(true);

    setResultMessage({
      type: "processing",
      message: `Adding host ${newDevice.ip}... Running Ansible scan...`,
    });

    try {
      const response = await fetch(`${API_BASE_URL}/hosts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newDevice,
          groupIds: selectedGroups,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResultMessage({
          type: "success",
          message: data.message || `Host ${newDevice.ip} added successfully`,
        });

        setNewDevice({
          ip: "",
          osName: "",
          osVersion: "",
          loginId: "",
          password: "",
        });
        setIpError("");
        setSelectedGroups([]);

        await fetchDevices();
      } else {
        throw new Error(data.error || "Failed to add host");
      }
    } catch (err) {
      console.error("Error adding host:", err);
      setResultMessage({
        type: "error",
        message: err.message || "Failed to add host. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableOS = useMemo(() => {
    return [...new Set(devices.map((device) => device.osName))].sort();
  }, [devices]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (osFilterRef.current && !osFilterRef.current.contains(event.target)) {
        setShowOSFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const matchesSearch = device.ip
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesOS =
        selectedOSFilters.length === 0 ||
        selectedOSFilters.includes(device.osName);
      return matchesSearch && matchesOS;
    });
  }, [searchQuery, selectedOSFilters, devices]);

  const toggleOSFilter = (osName) => {
    setSelectedOSFilters((prev) =>
      prev.includes(osName)
        ? prev.filter((os) => os !== osName)
        : [...prev, osName]
    );
    setCurrentPage(1);
  };

  const clearOSFilters = () => {
    setSelectedOSFilters([]);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredDevices.length / devicesPerPage);
  const startIndex = (currentPage - 1) * devicesPerPage;
  const currentDevices = filteredDevices.slice(
    startIndex,
    startIndex + devicesPerPage
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageDeviceIds = currentDevices.map((d) => d.id);
      setSelectedDevices([...new Set([...selectedDevices, ...pageDeviceIds])]);
    } else {
      const pageDeviceIds = currentDevices.map((d) => d.id);
      setSelectedDevices(
        selectedDevices.filter((id) => !pageDeviceIds.includes(id))
      );
    }
  };

  const handleSelectDevice = (deviceId) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handlePatchClick = async (device) => {
    setCurrentDevice(device);
    setIsLoading(true);
    setSelectedPatches([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/logs/scanlogs?hostIP=${device.ip}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch scan logs");
      }

      const scanLogData = await response.json();
      if (
        scanLogData &&
        scanLogData.updates &&
        scanLogData.updates.length > 0
      ) {
        const transformedUpdates = scanLogData.updates.map((update) => {
          let kbValue = update.kb;

          if (Array.isArray(kbValue) && kbValue.length > 0) {
            kbValue = kbValue[0];
          }

          if (kbValue && !kbValue.startsWith("KB")) {
            kbValue = `KB${kbValue}`;
          }

          console.log("[HostsPage] Transformed update:", {
            original: update.kb,
            transformed: kbValue,
            name: update.name,
          });

          return {
            ...update,
            kb: kbValue,
          };
        });

        console.log(
          "[HostsPage] Final transformed updates:",
          transformedUpdates
        );

        setAvailablePatches(transformedUpdates);
        setShowPatchDialog(true);
      } else {
        setAvailablePatches([]);
        setShowPatchDialog(true);
      }
    } catch (error) {
      console.error("Error fetching scan logs:", error);
      setResultMessage({
        type: "error",
        message: "Failed to fetch available patches",
      });
      setAvailablePatches([]);
      setShowPatchDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePatchSelection = (patchId) => {
    setSelectedPatches((prev) =>
      prev.includes(patchId)
        ? prev.filter((id) => id !== patchId)
        : [...prev, patchId]
    );
  };

  const toggleSelectAllPatches = () => {
    if (selectedPatches.length === availablePatches.length) {
      setSelectedPatches([]);
    } else {
      setSelectedPatches(availablePatches.map((patch) => patch._id));
    }
  };

  const handleUpdateClick = () => {
    if (selectedPatches.length === 0) {
      setResultMessage({
        type: "error",
        message: "Please select at least one patch to update",
      });
      return;
    }
    setShowConfirmUpdate(true);
  };

  const handleConfirmedUpdate = async () => {
    setShowConfirmUpdate(false);
    setIsDeploying(true);

    const patchesToDeploy = availablePatches.filter((patch) =>
      selectedPatches.includes(patch._id)
    );

    const deploymentData = {
      selectedPatches: patchesToDeploy.map((patch) => ({
        packageName: patch.name,
        currentVersion: patch.currentVersion,
        newVersion: patch.newVersion,
        patchId: patch._id,
      })),
    };

    console.log("Deployment Data being sent to API:", deploymentData);

    try {
      const response = await fetch(
        `${API_BASE_URL}/hosts/${currentDevice.id}/deploy-patches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deploymentData),
        }
      );

      const data = await response.json();

      console.log("API Response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to deploy patches");
      }

      setResultMessage({
        type: "success",
        message: `✅ Successfully deployed ${
          patchesToDeploy.length
        } patch(es) to ${currentDevice.ip}! Installed: ${
          data.data.installed
        }, Remaining: ${data.data.remaining}${
          data.data.reboot ? " (Host rebooted)" : ""
        }`,
      });

      setTimeout(() => {
        closePatchDialog();
        fetchDevices();
      }, 3000);
    } catch (error) {
      console.error("Error during patch deployment:", error);
      setResultMessage({
        type: "error",
        message: `Patch deployment failed`,
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const closePatchDialog = () => {
    setShowPatchDialog(false);
    setCurrentDevice(null);
    setAvailablePatches([]);
    setSelectedPatches([]);
    setIsDeploying(false);
  };

  const handleBulkUpdate = async () => {
    if (selectedDevices.length === 0) return;

    console.log(
      `[Frontend] Starting bulk update for ${selectedDevices.length} hosts`
    );

    setShowBulkDialog(false);
    setResultMessage({
      type: "processing",
      message: `Updating ${selectedDevices.length} host(s)... Installing patches and verifying. Hosts may reboot during this process. This will take several minutes per host. Please wait...`,
    });

    try {
      const res = await fetch(`${API_BASE_URL}/hosts/bulk-patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedDevices }),
      });
      const data = await res.json();

      console.log(`[Frontend] Bulk patch response:`, data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk patch failed");
      }

      const { success, failed, rebooted, details } = data;
      const verifiedCount = details?.filter((d) => d.scanSuccess).length || 0;

      let message = `✅ Bulk patch complete! Success: ${success}, Failed: ${failed}`;

      if (rebooted > 0) {
        message += `, 🔄 ${rebooted} host(s) rebooted`;
      }

      message += `. Verified: ${verifiedCount}/${success} hosts.`;

      setResultMessage({
        type: "success",
        message,
      });

      setSelectedDevices([]);
      setIsBulkMode(false);
      await fetchDevices();
    } catch (err) {
      console.error(`[Frontend] Bulk patch failed:`, err);
      setResultMessage({
        type: "error",
        message: `Bulk patch failed`,
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      "S.No.",
      "Host",
      "OS Name",
      "OS Version",
      "Last Patched",
      "Patches Available",
    ];
    const rows = filteredDevices.map((device, index) => [
      index + 1,
      device.ip,
      device.osName,
      device.osVersion,
      device.lastPatched,
      device.patchesAvailable.length,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    downloadFile(csvContent, "devices.csv", "text/csv");
  };

  const exportToExcel = () => {
    const headers = [
      "S.No.",
      "Host",
      "OS Name",
      "OS Version",
      "Last Patched",
      "Patches Available",
    ];
    const rows = filteredDevices.map((device, index) => [
      index + 1,
      device.ip,
      device.osName,
      device.osVersion,
      device.lastPatched,
      device.patchesAvailable.length,
    ]);

    const tsvContent = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");

    downloadFile(tsvContent, "devices.xls", "application/vnd.ms-excel");
  };

  const exportToPDF = () => {
    alert(
      "PDF export would require a library like jsPDF. For now, use CSV or Excel export."
    );
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteClick = (device) => {
    setHostToDelete(device);
    setDeletePassword("");
    setDeleteError("");
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setHostToDelete(null);
    setDeletePassword("");
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      setDeleteError("Password is required");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/${hostToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete host");
      }

      setResultMessage({
        type: "success",
        message: `Host ${hostToDelete.ip} deleted successfully`,
      });

      closeDeleteDialog();
      await fetchDevices();
    } catch (error) {
      console.error("Delete error:", error);
      setDeleteError(error.message || "Failed to delete host");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () =>
    setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />

      <div className="px-[4%] py-6">
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mb-4"></div>
              <p className="text-gray-900 dark:text-white font-medium">
                Processing...
              </p>
            </div>
          </div>
        )}

        {resultMessage && (
          <Toast
            type={resultMessage.type}
            message={resultMessage.message}
            onClose={() => setResultMessage(null)}
          />
        )}

        {/* Controls */}
        <ControlsBar
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          isBulkMode={isBulkMode}
          selectedDevicesCount={selectedDevices.length}
          showOSFilter={showOSFilter}
          onToggleOSFilter={(isOpen) => {
            if (typeof isOpen === "boolean") {
              setShowOSFilter(isOpen);
            } else {
              toggleOSFilter(isOpen);
            }
          }}
          selectedOSFilters={selectedOSFilters}
          onClearOSFilters={clearOSFilters}
          availableOS={availableOS}
          devices={devices}
          onToggleBulkMode={(mode) => {
            setIsBulkMode(mode);
            if (!mode) setSelectedDevices([]);
          }}
          onAddDeviceClick={() => setShowAddDeviceDialog(true)}
          onBulkUpdateClick={() => setShowBulkDialog(true)}
          onExportCSV={exportToCSV}
          onExportExcel={exportToExcel}
          onExportPDF={exportToPDF}
        />

        {/* Devices Table */}
        <HostsTable
          currentDevices={currentDevices}
          isBulkMode={isBulkMode}
          selectedDevices={selectedDevices}
          refreshingHostId={refreshingHostId}
          hostLastScanned={hostLastScanned}
          startIndex={startIndex}
          devicesPerPage={devicesPerPage}
          filteredDevices={filteredDevices}
          currentPage={currentPage}
          totalPages={totalPages}
          onSelectAll={handleSelectAll}
          onSelectDevice={handleSelectDevice}
          onPatchClick={handlePatchClick}
          onRefreshScan={handleRefreshScan}
          onDeleteClick={handleDeleteClick}
          getTimeAgo={getTimeAgo}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
        />

        {/* Add Device Dialog */}
        {showAddDeviceDialog && (
          <AddDeviceDialog
            show={showAddDeviceDialog}
            newDevice={newDevice}
            ipError={ipError}
            osOptions={osOptions}
            groups={groups}
            selectedGroups={selectedGroups}
            onIPChange={handleIPChange}
            onOSNameChange={handleOSNameChange}
            onOSVersionChange={handleOSVersionChange}
            onGroupSelectionChange={setSelectedGroups}
            onClose={() => {
              setShowAddDeviceDialog(false);
              setNewDevice({
                ip: "",
                osName: "",
                osVersion: "",
                loginId: "",
                password: "",
              });
              setIpError("");
              setSelectedGroups([]);
            }}
            onAdd={handleAddDevice}
          />
        )}

        <PatchDialog
          show={showPatchDialog}
          currentDevice={currentDevice}
          availablePatches={availablePatches}
          selectedPatches={selectedPatches}
          isDeploying={isDeploying}
          showConfirmUpdate={showConfirmUpdate}
          onClose={closePatchDialog}
          onTogglePatch={togglePatchSelection}
          onToggleAll={toggleSelectAllPatches}
          onUpdateClick={handleUpdateClick}
          onConfirmedUpdate={handleConfirmedUpdate}
          onCancelConfirm={() => setShowConfirmUpdate(false)}
        />

        {/* Bulk Update Confirmation Dialog */}
        <BulkUpdateDialog
          show={showBulkDialog}
          selectedDevicesCount={selectedDevices.length}
          onClose={() => setShowBulkDialog(false)}
          onConfirm={handleBulkUpdate}
        />

        {/* Delete Host Dialog */}
        {showDeleteDialog && hostToDelete && (
          <DeleteDialog
            show={showDeleteDialog}
            hostToDelete={hostToDelete}
            deletePassword={deletePassword}
            deleteError={deleteError}
            isDeleting={isDeleting}
            onClose={closeDeleteDialog}
            onPasswordChange={(password) => {
              setDeletePassword(password);
              setDeleteError("");
            }}
            onConfirmDelete={handleConfirmDelete}
          />
        )}
      </div>
    </div>
  );
}

export default HostsPage;
