import { useEffect, useMemo, useState } from "react";
import AdminNavbar from "../components/navbar/AdminNavbar";
import LoadingOverlay from "../components/common/LoadingOverlay";
import Toast from "../components/common/Toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PatchInstallLogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/logs?logType=patch_install&limit=200`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      } else {
        setResultMessage({ type: "error", message: data.error || "Failed to load logs" });
      }
    } catch (err) {
      setResultMessage({ type: "error", message: "Failed to load logs" });
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      [
        l.patchId,
        l.patchName,
        ...(l.hostIPs || []),
        ...(l.results || []).map((r) => r.hostIP),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [logs, search]);

  const formatTs = (ts) =>
    ts
      ? new Date(ts).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <div className="px-[4%] py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Patch Install Logs
          </h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patch or host..."
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 w-64"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">Patch</th>
                  <th className="px-4 py-2 text-left">Hosts</th>
                  <th className="px-4 py-2 text-left">Success</th>
                  <th className="px-4 py-2 text-left">Failed</th>
                  <th className="px-4 py-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((log) => (
                  <tr key={log._id}>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                      {formatTs(log.timestamp || log.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                      <div className="font-semibold">{log.patchName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {log.patchId}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                      {(log.hostIPs || []).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-2 text-green-600 dark:text-green-400">
                      {log.successCount ?? 0}
                    </td>
                    <td className="px-4 py-2 text-red-600 dark:text-red-400">
                      {log.failureCount ?? 0}
                    </td>
                    <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {(log.results || []).map((r, i) => (
                          <div
                            key={i}
                            className={`text-xs rounded px-2 py-1 ${
                              r.success
                                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            }`}
                          >
                            <span className="font-semibold">{r.hostIP}</span>:{" "}
                            {r.message || r.error || (r.success ? "Success" : "Failed")}
                          </div>
                        ))}
                        {(log.results || []).length === 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            No per-host results recorded
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No patch install logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LoadingOverlay show={isLoading} title="Loading" message="Fetching patch install logs" />
      <Toast
        type={resultMessage?.type || "error"}
        message={resultMessage?.message}
        onClose={() => setResultMessage(null)}
      />
    </div>
  );
}

export default PatchInstallLogsPage;