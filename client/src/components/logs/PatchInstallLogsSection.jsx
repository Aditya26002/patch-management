import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const TYPE_OPTIONS = [
  { label: "All Patch Install Logs", value: "" },
  { label: "Successful Installs", value: "success" },
  { label: "Failed Installs", value: "failed" },
  { label: "Partial Success", value: "partial" },
];

function PatchInstallLogsSection() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [totalLogs, setTotalLogs] = useState(0);

  const typeFilterRef = useRef(null);
  const logsPerPage = 25;

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedType, startDate, endDate]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: logsPerPage,
      });
      params.append("logType", "patch_install");
      if (selectedType) params.append("status", selectedType);
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
      console.error("Error fetching patch install logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
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
        log.patchId,
        log.patchName,
        ...(log.hostIPs || []),
        ...(log.results || []).map((r) => r.hostIP),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [searchQuery, logs]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedType("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

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
    doc.text("Patch Install Log", 10, y);
    doc.setFont(undefined, "normal");
    ensureSpace(10);

    addLine("ID", log._id || "-");
    addLine("Patch Name", log.patchName || "-");
    addLine("Patch ID", log.patchId || "-");
    addLine("Timestamp", formatTimestamp(log.timestamp || log.createdAt));
    addLine("Success Count", log.successCount || 0);
    addLine("Failure Count", log.failureCount || 0);

    if (Array.isArray(log.hostIPs) && log.hostIPs.length) {
      addSection("Target Hosts", log.hostIPs.join(", "));
    }

    if (Array.isArray(log.results) && log.results.length) {
      addSection(
        "Results",
        log.results
          .map(
            (r, idx) =>
              `${idx + 1}. ${r.hostIP || "-"} | Status: ${
                r.status || "-"
              } | Message: ${r.message || "-"}`
          )
          .join("\n")
      );
    }

    addSection("Raw JSON", JSON.stringify(log, null, 2));

    const safeName = (log.patchName || "patch").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const ts =
      log.timestamp || log.createdAt
        ? new Date(log.timestamp || log.createdAt)
            .toISOString()
            .replace(/[:T]/g, "-")
            .split(".")[0]
        : "timestamp";
    doc.save(`${safeName}-install-log-${ts}.pdf`);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 mb-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <input
              type="text"
              placeholder="Search by patch or host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-xs placeholder:tracking-wide"
            />
            <div className="relative" ref={typeFilterRef}>
              <button
                onClick={() => setShowTypeFilter(!showTypeFilter)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-xs"
              >
                <span>
                  {selectedType ? `Status: ${selectedType}` : "All Status"}
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

        {(searchQuery || selectedType || startDate || endDate) && (
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
              {selectedType && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                  Status: {selectedType}
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
                <th className="px-4 py-2 text-left font-semibold tracking-wider">
                  Patch Name
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Patch ID
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Success/Failed
                </th>
                <th className="px-4 py-2 text-center font-semibold tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
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
                        Loading patch install logs...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
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
                        No patch install logs found
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr
                    key={log._id || index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-1 text-xs text-left text-gray-900 dark:text-white">
                      {(currentPage - 1) * logsPerPage + index + 1}.
                    </td>
                    <td className="px-4 py-1 text-xs text-left font-medium text-blue-600 dark:text-blue-400">
                      {log.patchName || "-"}
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      {log.patchId || "-"}
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      {formatTimestamp(log.timestamp || log.createdAt)}
                    </td>
                    <td className="px-4 py-1 text-xs text-center text-gray-900 dark:text-white">
                      <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200 rounded text-xs font-medium">
                        {log.successCount || 0}
                      </span>
                      {" / "}
                      <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200 rounded text-xs font-medium">
                        {log.failureCount || 0}
                      </span>
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
                Patch Install Log Details - {selectedLog.patchName}
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

export default PatchInstallLogsSection;
