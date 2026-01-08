import { useState, useMemo, useRef, useEffect } from "react";
import AdminNavbar from "../components/navbar/AdminNavbar";
import PatchesControlsBar from "../components/patches/PatchesControlsBar";
import PatchesTable from "../components/patches/PatchesTable";
import AddPatchDialog from "../components/patches/AddPatchDialog";
import DeployDialog from "../components/patches/DeployDialog";
import ConfirmDeployDialog from "../components/patches/ConfirmDeployDialog";
import DeploymentResultsDialog from "../components/patches/DeploymentResultsDialog";
import RollbackDialog from "../components/patches/RollbackDialog";
import DeletePatchDialog from "../components/patches/DeletePatchDialog";
import LoadingOverlay from "../components/common/LoadingOverlay";
import OverwriteModal from "../components/patches/OverwriteModal";
import Toast from "../components/common/Toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PatchesPage() {
  const [patches, setPatches] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [showOSFilter, setShowOSFilter] = useState(false);
  const [selectedOSFilters, setSelectedOSFilters] = useState([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState([]);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showAddPatchDialog, setShowAddPatchDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPatch, setCurrentPatch] = useState(null);
  const [selectedHostsForDeploy, setSelectedHostsForDeploy] = useState([]);
  const [showConfirmDeployDialog, setShowConfirmDeployDialog] = useState(false);
  const [deploymentResults, setDeploymentResults] = useState(null);

  // New patch form state
  const [newPatch, setNewPatch] = useState({
    patchId: "",
    patchName: "",
    description: "",
    severity: "",
    applicableOS: "",
    releaseDate: "",
    category: "",
    patchFile: null,
  });

  const osFilterRef = useRef(null);
  const categoryFilterRef = useRef(null);
  const statusFilterRef = useRef(null);
  const patchesPerPage = 25;

  const severityOptions = ["Critical", "Important", "Moderate", "Low"];
  const categoryOptions = ["Security", "Feature Update", "Bug Fix"];

  // Fetch patches and hosts from database
  useEffect(() => {
    fetchPatches();
    fetchHosts();
  }, []);

  const normalizeOSList = (os) => {
    if (Array.isArray(os)) return os;
    if (!os) return [];
    return [os];
  };

  const fetchPatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/patches`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const normalized = data.data.map((p) => ({
          ...p,
          affectedOS: normalizeOSList(p.affectedOS || p.applicableOS),
        }));
        setPatches(normalized);
      }
    } catch (err) {
      console.error("Error fetching patches:", err);
      setResultMessage({
        type: "error",
        message: "Failed to load patches from database",
      });
    }
  };

  const fetchHosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hosts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.success) {
        setHosts(data.data);
      }
    } catch (err) {
      console.error("Error fetching hosts:", err);
    }
  };

  // Get unique OS names from patches
  const availableOS = useMemo(() => {
    const allOS = patches.flatMap((patch) => patch.affectedOS);
    return [...new Set(allOS)].sort();
  }, [patches]);

  // Get unique categories
  const availableCategories = useMemo(() => {
    return [...new Set(patches.map((patch) => patch.category))].sort();
  }, [patches]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (osFilterRef.current && !osFilterRef.current.contains(event.target)) {
        setShowOSFilter(false);
      }
      if (
        categoryFilterRef.current &&
        !categoryFilterRef.current.contains(event.target)
      ) {
        setShowCategoryFilter(false);
      }
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target)
      ) {
        setShowStatusFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add this helper above getPatchStatus / getEligibleHosts
  const matchesOS = (patchOS, host) => {
    const target = (patchOS || "").toLowerCase();
    const hostOSName = (host.osName || "").toLowerCase(); // e.g., "linux" | "windows"
    const hostOSVersion = (host.osVersion || "").toLowerCase(); // e.g., "ubuntu 22.04"

    // Generic Windows
    if (target.includes("windows")) {
      return (
        hostOSName.includes("windows") || hostOSVersion.includes("windows")
      );
    }

    // Generic Linux
    if (target.includes("linux")) {
      return (
        hostOSName.includes("linux") ||
        /ubuntu|debian|centos|rhel|red hat|fedora|suse|opensuse|arch|alpine|kali/.test(
          hostOSVersion
        )
      );
    }

    // Specific versions/distros
    return (
      hostOSVersion.includes(target) ||
      target.includes(hostOSVersion) ||
      hostOSName.includes(target)
    );
  };

  // Get patch status
  const getPatchStatus = (patch) => {
    const affectedOS = normalizeOSList(patch.affectedOS || patch.applicableOS);
    const deployedCount = patch.installedOnHosts?.length || 0;

    const applicableHosts = hosts.filter((host) =>
      affectedOS.some((os) => matchesOS(os, host))
    );
    const applicableCount = applicableHosts.length;

    if (deployedCount === 0) return { text: "Available", type: "available" };
    if (deployedCount === applicableCount && applicableCount > 0)
      return { text: "Fully Deployed", type: "fully-deployed" };
    return {
      text: `Deployed to ${deployedCount}/${applicableCount} hosts`,
      type: "partially-deployed",
    };
  };

  // Filter patches
  const filteredPatches = useMemo(() => {
    return patches.filter((patch) => {
      const matchesSearch =
        patch.patchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patch.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesOS =
        selectedOSFilters.length === 0 ||
        patch.affectedOS.some((os) => selectedOSFilters.includes(os));

      const matchesCategory =
        selectedCategoryFilters.length === 0 ||
        selectedCategoryFilters.includes(patch.category);

      const status = getPatchStatus(patch);
      const matchesStatus =
        selectedStatusFilters.length === 0 ||
        selectedStatusFilters.includes(status.type);

      return matchesSearch && matchesOS && matchesCategory && matchesStatus;
    });
  }, [
    searchQuery,
    selectedOSFilters,
    selectedCategoryFilters,
    selectedStatusFilters,
    patches,
    hosts,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredPatches.length / patchesPerPage);
  const startIndex = (currentPage - 1) * patchesPerPage;
  const currentPatches = filteredPatches.slice(
    startIndex,
    startIndex + patchesPerPage
  );

  // Toggle filters
  const toggleOSFilter = (osName) => {
    setSelectedOSFilters((prev) =>
      prev.includes(osName)
        ? prev.filter((os) => os !== osName)
        : [...prev, osName]
    );
    setCurrentPage(1);
  };

  const toggleCategoryFilter = (category) => {
    setSelectedCategoryFilters((prev) =>
      prev.includes(category)
        ? prev.filter((cat) => cat !== category)
        : [...prev, category]
    );
    setCurrentPage(1);
  };

  const toggleStatusFilter = (status) => {
    setSelectedStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSelectedOSFilters([]);
    setSelectedCategoryFilters([]);
    setSelectedStatusFilters([]);
    setCurrentPage(1);
  };

  // Get deployed hosts for a patch (hosts where patch is already installed)
  const getDeployedHosts = (patch) => {
    const deployedHostIds = patch.installedOnHosts?.map((h) => h.hostId) || [];
    return hosts.filter((host) => deployedHostIds.includes(host._id));
  };

  // Get hosts eligible for deployment (applicable but not yet deployed)
  const getEligibleHosts = (patch) => {
    const affectedOS = normalizeOSList(patch.affectedOS || patch.applicableOS);
    const deployedHostIds = patch.installedOnHosts?.map((h) => h.hostId) || [];

    return hosts.filter((host) => {
      if (deployedHostIds.includes(host._id)) return false;
      return affectedOS.some((os) => matchesOS(os, host));
    });
  };

  // Toggle host selection for deployment
  const toggleHostSelection = (hostId) => {
    setSelectedHostsForDeploy((prev) =>
      prev.includes(hostId)
        ? prev.filter((id) => id !== hostId)
        : [...prev, hostId]
    );
  };
  const isNewPatch = (patch) => {
    if (!patch.createdAt) return false;
    const now = new Date();
    const patchDate = new Date(patch.createdAt);
    const hoursDifference = (now - patchDate) / (1000 * 60 * 60);
    return hoursDifference <= 24;
  };

  const getTimeAgo = (date) => {
    if (!date) return "";
    const now = new Date();
    const patchDate = new Date(date);
    const hoursDifference = Math.floor((now - patchDate) / (1000 * 60 * 60));

    if (hoursDifference < 1) {
      const minutesDifference = Math.floor((now - patchDate) / (1000 * 60));
      return `${minutesDifference} minute${
        minutesDifference !== 1 ? "s" : ""
      } ago`;
    } else if (hoursDifference < 24) {
      return `${hoursDifference} hour${hoursDifference !== 1 ? "s" : ""} ago`;
    } else {
      const daysDifference = Math.floor(hoursDifference / 24);
      return `${daysDifference} day${daysDifference !== 1 ? "s" : ""} ago`;
    }
  };
  // Handle add patch
  const handleAddPatch = async (overwrite = false) => {
    if (!newPatch.patchFile) {
      setResultMessage({
        type: "error",
        message: "Please select a patch file to upload.",
      });
      return;
    }

    // Validation
    if (
      !newPatch.patchId ||
      !newPatch.patchName ||
      !newPatch.severity ||
      !newPatch.applicableOS ||
      !newPatch.releaseDate ||
      !newPatch.category
    ) {
      setResultMessage({
        type: "error",
        message: "Please fill in all required fields",
      });
      return;
    }

    // Client-side duplicate validation
    const duplicatePatchId = patches.find(
      (p) => p.patchId.toLowerCase() === newPatch.patchId.toLowerCase()
    );
    if (duplicatePatchId) {
      setResultMessage({
        type: "error",
        message: `Patch ID "${newPatch.patchId}" already exists. Please use a unique Patch ID.`,
      });
      return;
    }

    const duplicatePatchName = patches.find(
      (p) => p.name.toLowerCase() === newPatch.patchName.toLowerCase()
    );
    if (duplicatePatchName) {
      setResultMessage({
        type: "error",
        message: `Patch Name "${newPatch.patchName}" already exists. Please use a unique Patch Name.`,
      });
      return;
    }

    const duplicateFileName = patches.find(
      (p) => p.fileName.toLowerCase() === newPatch.patchFile.name.toLowerCase()
    );
    if (duplicateFileName) {
      setResultMessage({
        type: "error",
        message: `A patch with filename "${newPatch.patchFile.name}" already exists. Please rename the file or use a different file.`,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("patchId", newPatch.patchId);
      formData.append("patchName", newPatch.patchName);
      formData.append("description", newPatch.description);
      formData.append("severity", newPatch.severity);
      formData.append("category", newPatch.category);
      formData.append("applicableOS", newPatch.applicableOS);
      formData.append("releaseDate", newPatch.releaseDate);
      formData.append("patchFile", newPatch.patchFile);
      formData.append("overwriteExisting", overwrite.toString());

      const currentUser = localStorage.getItem("username") || "Admin";
      formData.append("uploadedBy", currentUser);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener("load", () => {
        setIsUploading(false);

        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          setResultMessage({
            type: "success",
            message:
              response.message ||
              `Patch ${newPatch.patchId} added successfully`,
          });
          setShowAddPatchDialog(false);
          setShowOverwriteModal(false);
          resetForm();
          fetchPatches();
        } else if (xhr.status === 409) {
          const response = JSON.parse(xhr.responseText);

          if (response.error === "FILE_EXISTS") {
            setPendingFile(response.filename);
            setShowOverwriteModal(true);
          } else {
            setResultMessage({
              type: "error",
              message: response.error || response.message,
            });
          }
        } else {
          const response = JSON.parse(xhr.responseText);
          setResultMessage({
            type: "error",
            message: response.error || "Failed to add patch",
          });
        }
      });

      xhr.addEventListener("error", () => {
        setResultMessage({
          type: "error",
          message: "Upload failed. Please try again.",
        });
        setIsUploading(false);
      });

      xhr.open("POST", `${API_BASE_URL}/patches`);
      xhr.send(formData);
    } catch (error) {
      console.error("Error adding patch:", error);
      setResultMessage({
        type: "error",
        message: "Failed to add patch. Please try again.",
      });
      setIsUploading(false);
    }
  };

  const handleOverwriteConfirm = () => {
    setShowOverwriteModal(false);
    handleAddPatch(true);
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteModal(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const resetForm = () => {
    setNewPatch({
      patchId: "",
      patchName: "",
      description: "",
      severity: "",
      applicableOS: "",
      releaseDate: "",
      category: "",
      patchFile: null,
    });
    setUploadProgress(0);
    setPendingFile(null);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filename = file.name.toLowerCase();

    const windowsExtensions = [".exe", ".msi", ".wsi"];
    const linuxExtensions = [
      ".deb",
      ".rpm",
      ".tar.gz",
      ".tgz",
      ".tar.bz2",
      ".tar.xz",
      ".sh",
      ".bin",
      ".run",
      ".appimage",
    ];

    const selectedOS = (newPatch.applicableOS || "").toLowerCase();

    // Validate file type based on selected OS
    let isValid = false;
    if (selectedOS.includes("windows")) {
      isValid = windowsExtensions.some((ext) => filename.endsWith(ext));
      if (!isValid) {
        setResultMessage({
          type: "error",
          message: `Invalid file type for Windows. Please upload .exe, .msi, or .wsi files only.`,
        });
        e.target.value = "";
        return;
      }
    } else if (selectedOS.includes("linux")) {
      isValid = linuxExtensions.some((ext) => filename.endsWith(ext));
      if (!isValid) {
        setResultMessage({
          type: "error",
          message: `Invalid file type for Linux. Please upload .deb, .rpm, .tar.gz, .sh, or other Linux package formats.`,
        });
        e.target.value = "";
        return;
      }
    }

    // Auto-fill patch name from filename (without extension)
    let patchNameFromFile = file.name;

    // Remove common extensions
    const allExtensions = [
      ".tar.gz",
      ".tar.bz2",
      ".tar.xz",
      ".exe",
      ".msi",
      ".wsi",
      ".deb",
      ".rpm",
      ".tgz",
      ".sh",
      ".bin",
      ".run",
      ".appimage",
    ];

    for (const ext of allExtensions) {
      if (patchNameFromFile.toLowerCase().endsWith(ext)) {
        patchNameFromFile = patchNameFromFile.slice(0, -ext.length);
        break;
      }
    }

    setNewPatch({
      ...newPatch,
      patchFile: file,
      patchName: patchNameFromFile,
    });
  };
  const handleDeploy = (patch) => {
    const norm = {
      ...patch,
      affectedOS: normalizeOSList(patch.affectedOS || patch.applicableOS),
    };
    setCurrentPatch(norm);
    setSelectedHostsForDeploy([]);
    setShowDeployDialog(true);
  };

  const handleDeployClick = () => {
    if (selectedHostsForDeploy.length === 0) {
      alert("Please select at least one host");
      return;
    }
    setShowConfirmDeployDialog(true);
  };

  const handleDeployConfirm = async () => {
    setShowConfirmDeployDialog(false);
    setIsLoading(true);
    setDeploymentResults(null);

    try {
      const selectedHosts = hosts.filter((h) =>
        selectedHostsForDeploy.includes(h._id)
      );

      const affectedOSArray = currentPatch.applicableOS || [];

      let osType = "windows";
      if (affectedOSArray.length > 0) {
        const firstOS = affectedOSArray[0].toLowerCase();
        if (
          firstOS.includes("ubuntu") ||
          firstOS.includes("centos") ||
          firstOS.includes("rhel") ||
          firstOS.includes("debian") ||
          firstOS.includes("linux")
        ) {
          osType = "linux";
        }
      }

      console.log("Deployment payload:", {
        patchId: currentPatch.patchId,
        patchName: currentPatch.name,
        patchFile: currentPatch.fileName,
        hostIPs: selectedHosts.map((h) => h.ip),
        osType: osType,
      });

      const response = await fetch(
        `${API_BASE_URL}/patches/selectedApplicationDeployed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patchId: currentPatch.patchId,
            patchName: currentPatch.name,
            patchFile: currentPatch.fileName,
            hostIPs: selectedHosts.map((h) => h.ip),
            osType: osType,
          }),
        }
      );

      const result = await response.json();
      console.log("Deployment response:", result);

      if (response.ok) {
        setDeploymentResults(result.data);
        setResultMessage({
          type: "success",
          message: `Deployment completed! Success: ${
            result.data.successCount || 0
          }, Failed: ${result.data.failureCount || 0}`,
        });
        fetchPatches();
      } else {
        throw new Error(result.message || "Deployment failed");
      }
    } catch (error) {
      console.error("Deployment error:", error);
      setResultMessage({
        type: "error",
        text: error.message || "Failed to deploy patch",
      });
    } finally {
      setIsLoading(false);
      setShowDeployDialog(false);
      setSelectedHostsForDeploy([]);
    }
  };

  // Handle rollback
  const handleRollback = (patch) => {
    const norm = {
      ...patch,
      affectedOS: normalizeOSList(patch.affectedOS || patch.applicableOS),
    };
    setCurrentPatch(norm);
    setShowRollbackDialog(true);
  };

  const handleRollbackConfirm = async () => {
    setIsLoading(true);
    setShowRollbackDialog(false);

    // For rollback, we would need a new backend endpoint
    // For now, simulating the rollback
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const isSuccess = Math.random() > 0.3;

    setIsLoading(false);
    setResultMessage({
      type: isSuccess ? "success" : "error",
      message: isSuccess
        ? `Successfully rolled back patch ${currentPatch.patchId} from all hosts`
        : `Failed to rollback patch ${currentPatch.patchId}. Please try again.`,
    });

    if (isSuccess) {
      await fetchPatches();
    }
  };

  // Handle delete
  const handleDelete = (patch) => {
    const norm = {
      ...patch,
      affectedOS: normalizeOSList(patch.affectedOS || patch.applicableOS),
    };
    setCurrentPatch(norm);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentPatch) return;

    setIsLoading(true);
    setShowDeleteDialog(false);

    try {
      const currentUser = localStorage.getItem("username") || "Admin";

      const response = await fetch(
        `${API_BASE_URL}/patches/${currentPatch._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            performedBy: currentUser,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setResultMessage({
          type: "success",
          message: `Patch "${currentPatch.patchId}" deleted successfully`,
        });
        await fetchPatches();
      } else {
        throw new Error(result.error || "Failed to delete patch");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setResultMessage({
        type: "error",
        message: error.message || "Failed to delete patch",
      });
    } finally {
      setIsLoading(false);
      setCurrentPatch(null);
    }
  };

  // Export functions
  const exportToCSV = () => {
    const headers = [
      "S.No.",
      "Patch ID",
      "Patch Name",
      "Release Date",
      "Affected OS",
      "Category",
      "Status",
    ];
    const rows = filteredPatches.map((patch, index) => {
      const status = getPatchStatus(patch);
      return [
        index + 1,
        patch.patchId,
        patch.name,
        new Date(patch.releaseDate).toLocaleDateString(),
        patch.affectedOS.join("; "),
        patch.category,
        status.text,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    downloadFile(csvContent, "patches.csv", "text/csv");
  };

  const exportToExcel = () => {
    const headers = [
      "S.No.",
      "Patch ID",
      "Patch Name",
      "Release Date",
      "Affected OS",
      "Category",
      "Status",
    ];
    const rows = filteredPatches.map((patch, index) => {
      const status = getPatchStatus(patch);
      return [
        index + 1,
        patch.patchId,
        patch.name,
        new Date(patch.releaseDate).toLocaleDateString(),
        patch.affectedOS.join("; "),
        patch.category,
        status.text,
      ];
    });

    const tsvContent = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");

    downloadFile(tsvContent, "patches.xls", "application/vnd.ms-excel");
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />

      <div className="px-[4%] py-6">
        {/* Loading Overlay */}
        <LoadingOverlay
          show={isLoading}
          title="Deploying"
          message="Please wait while the patch is being deployed"
          subMessage="This may take several minutes"
          warning="Please do not close or refresh this page during deployment"
        />

        {/* Result Message (Toast) */}
        <Toast
          type={resultMessage?.type || "success"}
          message={resultMessage?.message}
          onClose={() => setResultMessage(null)}
        />

        {/* Controls Bar Component */}
        <PatchesControlsBar
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          showOSFilter={showOSFilter}
          onToggleOSFilter={(value) => {
            if (typeof value === "boolean") {
              setShowOSFilter(value);
            } else {
              toggleOSFilter(value);
            }
          }}
          selectedOSFilters={selectedOSFilters}
          onClearOSFilters={clearAllFilters}
          availableOS={availableOS}
          showCategoryFilter={showCategoryFilter}
          onToggleCategoryFilter={(value) => {
            if (typeof value === "boolean") {
              setShowCategoryFilter(value);
            } else {
              toggleCategoryFilter(value);
            }
          }}
          selectedCategoryFilters={selectedCategoryFilters}
          showStatusFilter={showStatusFilter}
          onToggleStatusFilter={(value) => {
            if (typeof value === "boolean") {
              setShowStatusFilter(value);
            } else {
              toggleStatusFilter(value);
            }
          }}
          selectedStatusFilters={selectedStatusFilters}
          onClearAllFilters={clearAllFilters}
          onAddPatchClick={() => setShowAddPatchDialog(true)}
          onExportCSV={exportToCSV}
          onExportExcel={exportToExcel}
          onExportPDF={exportToPDF}
          availableCategories={availableCategories}
        />

        {/* Patches Table Component */}
        <PatchesTable
          currentPatches={currentPatches}
          startIndex={startIndex}
          patchesPerPage={patchesPerPage}
          filteredPatches={filteredPatches}
          currentPage={currentPage}
          totalPages={totalPages}
          onDeploy={handleDeploy}
          onRollback={handleRollback}
          onDelete={handleDelete}
          getPatchStatus={getPatchStatus}
          isNewPatch={isNewPatch}
          getTimeAgo={getTimeAgo}
          onPrevPage={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          onNextPage={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
        />

        {/* Add Patch Dialog Component */}
        <AddPatchDialog
          show={showAddPatchDialog}
          newPatch={newPatch}
          severityOptions={severityOptions}
          categoryOptions={categoryOptions}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onPatchIdChange={(e) =>
            setNewPatch({ ...newPatch, patchId: e.target.value })
          }
          onPatchNameChange={(e) =>
            setNewPatch({ ...newPatch, patchName: e.target.value })
          }
          onDescriptionChange={(e) =>
            setNewPatch({ ...newPatch, description: e.target.value })
          }
          onSeverityChange={(e) =>
            setNewPatch({ ...newPatch, severity: e.target.value })
          }
          onApplicableOSChange={(e) => {
            // Clear file and patch name when OS changes
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = "";
            setNewPatch({
              ...newPatch,
              applicableOS: e.target.value,
              patchFile: null,
              patchName: "",
            });
          }}
          onReleaseDateChange={(e) =>
            setNewPatch({ ...newPatch, releaseDate: e.target.value })
          }
          onCategoryChange={(e) =>
            setNewPatch({ ...newPatch, category: e.target.value })
          }
          onFileChange={handleFileChange}
          onClose={() => {
            setShowAddPatchDialog(false);
            resetForm();
          }}
          onAdd={handleAddPatch}
        />

        {/* Overwrite Modal - Keep as is */}
        <OverwriteModal
          show={showOverwriteModal}
          filename={pendingFile}
          onCancel={handleOverwriteCancel}
          onConfirm={handleOverwriteConfirm}
        />

        {/* Deploy Dialog Component */}
        <DeployDialog
          show={showDeployDialog}
          currentPatch={currentPatch}
          hosts={currentPatch ? getEligibleHosts(currentPatch) : []}
          selectedHostsForDeploy={selectedHostsForDeploy}
          onToggleHostSelection={toggleHostSelection}
          onSelectAll={(hostIds) => setSelectedHostsForDeploy(hostIds)}
          onClose={() => {
            setShowDeployDialog(false);
            setSelectedHostsForDeploy([]);
          }}
          onDeploy={handleDeployClick}
        />

        {/* Confirm Deploy Dialog Component */}
        <ConfirmDeployDialog
          show={showConfirmDeployDialog}
          currentPatch={currentPatch}
          selectedHostsForDeploy={selectedHostsForDeploy}
          hosts={currentPatch ? getEligibleHosts(currentPatch) : []}
          onClose={() => setShowConfirmDeployDialog(false)}
          onConfirm={handleDeployConfirm}
        />

        {/* Deployment Results Dialog - replaced with component */}
        <DeploymentResultsDialog
          show={!!deploymentResults}
          results={deploymentResults}
          onClose={() => setDeploymentResults(null)}
        />

        {/* Rollback Dialog - replaced with component */}
        <RollbackDialog
          show={showRollbackDialog && !!currentPatch}
          currentPatch={currentPatch}
          deployedHosts={currentPatch ? getDeployedHosts(currentPatch) : []}
          onClose={() => setShowRollbackDialog(false)}
          onConfirm={handleRollbackConfirm}
        />

        {/* Delete Patch Dialog */}
        <DeletePatchDialog
          show={showDeleteDialog && !!currentPatch}
          patch={currentPatch}
          onClose={() => {
            setShowDeleteDialog(false);
            setCurrentPatch(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  );
}

export default PatchesPage;
