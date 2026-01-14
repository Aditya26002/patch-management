import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TYPE_OPTIONS = [
  { label: "All Logs", value: "" },
  { label: "Scan Logs", value: "scan" },
  { label: "Install Logs", value: "install" },
  { label: "Selective Install Logs", value: "selective" },
  { label: "Patch Install", value: "patch_install" },
  { label: "Host Activity", value: "host_activity" },
  { label: "Patch Added", value: "patch_added" },
  { label: "Patch Deleted", value: "patch_deleted" },
  { label: "Error Logs", value: "error" },
];

function ActivityLogsSection() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showOSFilter, setShowOSFilter] = useState(false);
  const [selectedOS, setSelectedOS] = useState("");
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [totalLogs, setTotalLogs] = useState(0);

  const osFilterRef = useRef(null);
  const typeFilterRef = useRef(null);
  const logsPerPage = 25;

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedOS, selectedType, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: logsPerPage,
      });
      if (selectedOS) params.append("os", selectedOS);
      if (selectedType) params.append("logType", selectedType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`${API_BASE_URL}/logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalLogs(data.pagination?.totalLogs || 0);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
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

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const fields = [
        log.hostIP,
        log.os,
        log.type,
        log.scanType,
        log.installType,
        log.patchId,
        log.patchName,
        log.operation,
        log.errorMessage,
        log.performedBy,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [searchQuery, logs]);

  const formatTimestamp = (timestamp) =>
    timestamp
      ? new Date(timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case "scan":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";
      case "install":
      case "selective":
      case "patch_install":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200";
      case "host_added":
      case "host_deleted":
      case "host_activity":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200";
      case "patch_added":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200";
      case "patch_deleted":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "scan":
        return "Scan";
      case "install":
        return "Install";
      case "selective":
        return "Selective Install";
      case "patch_install":
        return "Patch Install";
      case "host_added":
        return "Host Added";
      case "host_deleted":
        return "Host Deleted";
      case "patch_added":
        return "Patch Added";
      case "patch_deleted":
        return "Patch Deleted";
      case "error":
        return "Error";
      default:
        return type || "-";
    }
  };

  const getSummary = (log) => {
    const summarizeObject = (obj) => {
      if (!obj || typeof obj !== "object") return null;
      const { installed, failed, reboot_required } = obj;
      if (
        typeof installed !== "undefined" ||
        typeof failed !== "undefined" ||
        typeof reboot_required !== "undefined"
      ) {
        return `Installed: ${installed ?? 0}, Failed: ${failed ?? 0}${
          reboot_required ? " (Reboot)" : ""
        }`;
      }
      return JSON.stringify(obj);
    };

    switch (log.type) {
      case "scan":
        return `${log.totalUpdates ?? 0} updates`;
      case "install":
      case "selective":
        return `${log.success ? "Success" : "Failed"}${
          log.rebootRequired ? " (Reboot)" : ""
        }`;
      case "patch_install":
        return `${log.successCount ?? 0} success, ${
          log.failureCount ?? 0
        } failed`;
      case "host_added":
        return `Host added (${log.osName} ${log.osVersion})`;
      case "host_deleted":
        return `Host deleted (${log.osName} ${log.osVersion})`;
      case "patch_added":
        return `Patch added (${log.size || "Unknown size"})`;
      case "patch_deleted":
        return `Patch deleted`;
      case "error":
        return log.errorMessage || summarizeObject(log.summary) || "Error";
      default:
        return (
          summarizeObject(log.summary) || log.summary || log.message || "-"
        );
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleDownloadPDF = async (log) => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 12;

    const ensureSpace = (increment = 8) => {
      if (y > 280) {
        doc.addPage();
        y = 12;
      }
      y += increment;
    };

    const addLine = (label, value) => {
      doc.text(`${label}: ${value ?? "-"}`, 10, y);
      ensureSpace();
    };

    const addSection = (title, text) => {
      doc.setFont(undefined, "bold");
      doc.text(title, 10, y);
      doc.setFont(undefined, "normal");
      ensureSpace(6);
      const lines = doc.splitTextToSize(text, 190);
      lines.forEach((line) => {
        doc.text(line, 10, y);
        ensureSpace();
      });
      ensureSpace(4);
    };

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Patch Management Log", 10, y);
    doc.setFont(undefined, "normal");
    ensureSpace(10);

    addLine("ID", log._id || log.id || "-");
    addLine("Type", log.type || log.logType || "-");
    addLine("OS", log.os || log.operatingSystem || "-");
    addLine("Timestamp", formatTimestamp(log.timestamp || log.createdAt));
    addLine(
      "Host",
      log.hostIP ||
        log.host?.ip ||
        log.host?.hostname ||
        log.hostname ||
        log.host ||
        "-"
    );
    addLine("User", log.user || log.actor || "-");
    addLine("Summary", log.summary || "-");
    addLine("Details", log.details || log.message || "-");

    if (Array.isArray(log.updates) && log.updates.length) {
      addSection(
        `Updates (${log.updates.length})`,
        log.updates
          .map(
            (u, idx) =>
              `${idx + 1}. ${u.name || "-"} | current: ${
                u.currentVersion || "-"
              } -> new: ${u.newVersion || "-"} | KB: ${u.kb || "-"}`
          )
          .join("\n")
      );
    }

    addSection("Raw JSON", JSON.stringify(log, null, 2));

    const safeHost = (
      log.hostIP ||
      log.host?.ip ||
      log.host?.hostname ||
      log.hostname ||
      "log"
    )?.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ts =
      log.timestamp || log.createdAt
        ? new Date(log.timestamp || log.createdAt)
            .toISOString()
            .replace(/[:T]/g, "-")
            .split(".")[0]
        : "timestamp";
    const type = (log.type || log.logType || "log").toLowerCase();
    doc.save(`${safeHost}-${type}-${ts}.pdf`);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedOS("");
    setSelectedType("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <>
      {/* --- existing activity header/filters/table/modal unchanged --- */}
      {/* Copy of your current JSX */}
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 mb-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <input
              type="text"
              placeholder="Search by Host IP..."
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
                      setSelectedOS("linux");
                      setShowOSFilter(false);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                  >
                    Linux
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOS("windows");
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
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 max-w-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs placeholder:tracking-wide text-sm"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 max-w-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs placeholder:tracking-wide text-sm"
            />
          </div>
        </div>

        {(searchQuery ||
          selectedOS ||
          selectedType ||
          startDate ||
          endDate) && (
          <div className="flex items-center gap-2 mt-4">
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
              {startDate && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                  From: {startDate}
                </span>
              )}
              {endDate && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                  To: {endDate}
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm border-b border-gray-300 dark:border-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-semibold tracking-wider">
                  S.No.
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Host
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  OS
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Type
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Summary
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
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
                        Loading logs...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400">
                        No logs found
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={`${log.type}-${log._id}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-1 text-xs text-left text-gray-900 dark:text-white">
                      {(currentPage - 1) * logsPerPage +
                        filteredLogs.indexOf(log) +
                        1}
                      .
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-blue-500 font-medium">
                      {log.type === "patch_deleted" || log.type === "patch_added"
                        ? log.patchName || log.patchId || "-"
                        : log.hostIP ||
                          log.host?.ip ||
                          log.hostname ||
                          log.host ||
                          "-"}
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      <span className="capitalize">
                        {log.type === "patch_deleted" || log.type === "patch_added"
                          ? "-"
                          : log.os || log.osName || log.operatingSystem || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(
                          log.type
                        )}`}
                      >
                        {getTypeLabel(log.type)}
                      </span>
                    </td>
                    <td className=" px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      {formatTimestamp(log.timestamp || log.createdAt)}
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      {getSummary(log)}
                    </td>
                    <td className="px-4 py-1 text-xs text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="px-2 py-1 bg-orange-500 cursor-pointer text-white rounded-lg hover:bg-orange-600 transition-colors text-xs"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(log)}
                          className="px-2 py-1 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors text-xs"
                        >
                          Download PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredLogs.length > 0 && (
          <div className="px-4 py-1 flex items-center justify-between border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
            <div className="text-gray-700 dark:text-gray-300">
              Showing{" "}
              <span className="font-semibold">
                {(currentPage - 1) * logsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(currentPage * logsPerPage, totalLogs)}
              </span>{" "}
              of <span className="font-semibold">{totalLogs}</span> logs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Log Details -{" "}
                {selectedLog.type === "patch_deleted" ||
                selectedLog.type === "patch_added"
                  ? selectedLog.patchName || selectedLog.patchId
                  : selectedLog.hostIP}
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700  rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ActivityLogsSection;
