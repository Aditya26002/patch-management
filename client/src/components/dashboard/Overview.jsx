import { useEffect, useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Overview() {
  const [activeTab, setActiveTab] = useState("All");
  const [hosts, setHosts] = useState([]);
  const [logsByTab, setLogsByTab] = useState({
    All: [],
    Windows: [],
    Linux: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Fetch hosts
        const hostRes = await fetch(`${API_BASE_URL}/hosts`);
        const hostJson = await hostRes.json();
        const hostList = hostJson?.data || hostJson || [];
        setHosts(hostList);

        // Fetch latest 5 logs per tab
        const [allLogs, winLogs, linLogs] = await Promise.all([
          fetchLatestLogs(),
          fetchLatestLogs("windows"),
          fetchLatestLogs("linux"),
        ]);
        setLogsByTab({
          All: sortByTime(allLogs).slice(0, 5),
          Windows: sortByTime(winLogs).slice(0, 5),
          Linux: sortByTime(linLogs).slice(0, 5),
        });
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchLatestLogs = async (os) => {
    const params = new URLSearchParams({ page: 1, limit: 5 });
    if (os) params.append("os", os);
    const res = await fetch(`${API_BASE_URL}/logs?${params.toString()}`);
    const json = await res.json();
    return json?.data || [];
  };

  const sortByTime = (arr) =>
    [...(arr || [])].sort(
      (a, b) =>
        new Date(b.timestamp || b.createdAt || 0) -
        new Date(a.timestamp || a.createdAt || 0)
    );

  const { windowsCount, linuxCount, totalDevices } = useMemo(() => {
    const win = hosts.filter((h) =>
      (h.osName || h.os || "").toLowerCase().includes("win")
    ).length;
    const lin = hosts.filter((h) =>
      (h.osName || h.os || "").toLowerCase().includes("lin")
    ).length;
    return { windowsCount: win, linuxCount: lin, totalDevices: win + lin };
  }, [hosts]);

  const chartData = {
    labels: ["Windows", "Linux"],
    datasets: [
      {
        data: [windowsCount, linuxCount],
        backgroundColor: ["rgb(96, 165, 250)", "rgb(34, 197, 94)"],
        borderWidth: 0,
        cutout: "70%",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || "";
            const value = ctx.parsed || 0;
            const pct = totalDevices
              ? ((value / totalDevices) * 100).toFixed(1)
              : "0.0";
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  const tabs = ["All", "Windows", "Linux"];
  const filteredActivities = logsByTab[activeTab] || [];

  const formatTimestamp = (ts) =>
    ts
      ? new Date(ts).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  return (
    <div className="p-[2%]">
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-hidden">
        {/* HEADER */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Overview
        </h2>

        {/* CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-start">
          {/* Chart */}
          <div className="w-full h-full flex items-center justify-center gap-6">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {totalDevices}
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 space-y-2">
              <LegendItem
                color="bg-blue-400"
                label="Windows"
                value={windowsCount}
                total={totalDevices}
              />
              <LegendItem
                color="bg-green-500"
                label="Linux"
                value={linuxCount}
                total={totalDevices}
              />
            </div>
          </div>

          {/* Recent Activities */}
          <div className="flex flex-col min-w-0">
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "text-orange-500 border-b-2 border-orange-500"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="overflow-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-gray-800 text-black dark:text-white">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium">
                      Event Type
                    </th>
                    <th className="text-left py-2 px-2 font-medium">
                      Timestamp
                    </th>
                    <th className="text-left py-2 px-2 font-medium">Host</th>
                    <th className="text-left py-2 px-2 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredActivities.length ? (
                    filteredActivities.map((log, i) => (
                      <tr
                        key={`${log._id || i}`}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                      >
                        <td className="py-3 px-2 capitalize">
                          {log.type || log.logType || "-"}
                        </td>
                        <td className="py-3 px-2 ">
                          {formatTimestamp(log.timestamp || log.createdAt)}
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-blue-600 dark:text-blue-400 hover:underline">
                            {log.hostIP || log.host || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {log.summary || log.details || log.message || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center">
                        No activities found for {activeTab}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, total }) {
  const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900 dark:text-white">
          {value}
        </span>
        <span className="text-gray-500 dark:text-gray-400">({pct}%)</span>
      </div>
    </div>
  );
}

export default Overview;
