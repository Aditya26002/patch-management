import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function UpdateHistory() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(
    thirtyDaysAgo.toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState("bar"); // "bar" | "line"
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
      setChartKey((prev) => prev + 1); // Force chart re-render
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Update Chart.js global defaults based on theme
    ChartJS.defaults.color = isDark ? "#e5e7eb" : "#374151";
    ChartJS.defaults.borderColor = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
  }, [isDark]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: 1,
          limit: 500,
          startDate,
          endDate,
          logType: "install",
        });
        const res = await fetch(`${API_BASE_URL}/logs?${params.toString()}`);
        const json = await res.json();
        setLogs(json?.data || []);
      } catch (e) {
        console.error("Error fetching logs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [startDate, endDate]);

  const dateLabels = useMemo(() => {
    const labels = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      labels.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return labels;
  }, [startDate, endDate]);

  const counts = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const d = new Date(log.timestamp || log.createdAt);
      const key = d.toISOString().split("T")[0];
      const updatesCount = Array.isArray(log.updates) ? log.updates.length : 1;
      map[key] = (map[key] || 0) + updatesCount;
    });
    return dateLabels.map((d) => {
      const key = d.toISOString().split("T")[0];
      return map[key] || 0;
    });
  }, [logs, dateLabels]);

  const chartData = useMemo(
    () => ({
      labels: dateLabels.map((d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      ),
      datasets:
        chartType === "bar"
          ? [
              {
                type: "bar",
                label: "Updates Pushed",
                data: counts,
                backgroundColor: isDark
                  ? "rgb(59, 130, 246)"
                  : "rgb(96, 165, 250)",
                borderRadius: 1,
                maxBarThickness: 36,
              },
            ]
          : [
              {
                type: "line",
                label: "Updates Pushed",
                data: counts,
                borderColor: isDark ? "rgb(249, 115, 22)" : "rgb(234, 88, 12)",
                backgroundColor: isDark
                  ? "rgba(249, 115, 22, 0.15)"
                  : "rgba(234, 88, 12, 0.2)",
                tension: 0.2,
                pointRadius: 2,
                pointHoverRadius: 5,
                borderWidth: 2,
                fill: false,
              },
            ],
    }),
    [chartType, isDark, dateLabels, counts]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "white",
            font: {
              size: 12,
              weight: "500",
            },
            padding: 20,
          },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: {
            display: false,
            color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDark ? "#f3f4f6" : "#868e96",
            maxRotation: 0,
            autoSkipPadding: 20,
          },
          border: {
            color: isDark ? "#f3f4f6" : "#868e96",
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.max(10, ...counts),
          grid: {
            display: false,
            color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDark ? "#f3f4f6" : "#868e96",
            stepSize: 1,
          },
          border: {
            color: isDark ? "#f3f4f6" : "#868e96",
          },
        },
      },
    }),
    [isDark, counts]
  );

  const handleStartDateChange = (e) => {
    const newStart = new Date(e.target.value);
    const currentEnd = new Date(endDate);
    const minDate = new Date(currentEnd);
    minDate.setDate(minDate.getDate() - 30);
    if (newStart < minDate || newStart > currentEnd || newStart > today) {
      alert("Invalid start date");
      return;
    }
    setStartDate(e.target.value);
  };
  const handleEndDateChange = (e) => {
    const newEnd = new Date(e.target.value);
    const currentStart = new Date(startDate);
    const maxAllowed = new Date(currentStart);
    maxAllowed.setDate(maxAllowed.getDate() + 30);
    if (newEnd > today || newEnd < currentStart || newEnd > maxAllowed) {
      alert("Invalid end date");
      return;
    }
    setEndDate(e.target.value);
  };

  return (
    <div className="p-[2%]">
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Update History
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setChartType("bar")}
                className={`px-3 py-1 text-sm rounded-lg border ${
                  chartType === "bar"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1 text-sm rounded-lg border ${
                  chartType === "line"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                }`}
              >
                Line
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="start-date"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                From:
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                max={today.toISOString().split("T")[0]}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="end-date"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                To:
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                max={today.toISOString().split("T")[0]}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="w-full h-80">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : (
            <Bar key={chartKey} data={chartData} options={chartOptions} />
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          Showing data from{" "}
          {new Date(startDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          to{" "}
          {new Date(endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ({dateLabels.length} days)
        </div>
      </div>
    </div>
  );
}

export default UpdateHistory;
