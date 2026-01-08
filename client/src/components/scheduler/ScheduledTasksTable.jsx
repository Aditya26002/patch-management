import React from "react";

function ScheduledTasksTable({ tasks, onCancel, onDelete, onRefresh }) {
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        text: "text-yellow-700 dark:text-yellow-400",
        label: "Pending",
      },
      running: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        label: "Running",
      },
      completed: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        label: "Completed",
      },
      failed: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
        label: "Failed",
      },
      cancelled: {
        bg: "bg-gray-100 dark:bg-gray-700",
        text: "text-gray-700 dark:text-gray-400",
        label: "Cancelled",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full font-semibold ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination logic
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(tasks.length / pageSize);
  const paginatedTasks = tasks.slice((page - 1) * pageSize, page * pageSize);

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <svg
          className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Scheduled Tasks
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Schedule tasks will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Scheduled Tasks ({tasks.length})
        </h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Scheduled Time</th>
              <th className="px-4 py-2 text-center font-semibold">Task Type</th>
              <th className="px-4 py-2 text-center font-semibold">OS Type</th>
              <th className="px-4 py-2 text-center font-semibold">Items/Hosts</th>
              <th className="px-4 py-2 text-center font-semibold">Status</th>
              <th className="px-4 py-2 text-center font-semibold">Created</th>
              <th className="px-4 py-2 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedTasks.map((task) => (
              <tr
                key={task._id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-4 py-2 text-xs text-gray-900 dark:text-white">
                  {formatDate(task.scheduledTime)}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                    {task.taskType === "patch"
                      ? "Patch Deployment"
                      : "Host Update"}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-center text-gray-700 dark:text-gray-300">
                  {task.osType}
                </td>
                <td className="px-4 py-2 text-xs text-center text-gray-700 dark:text-gray-300">
                  {task.taskType === "patch"
                    ? `${task.patchIds?.length || 0} patches`
                    : `${task.hostIds?.length || 0} hosts`}
                </td>
                <td className="px-4 py-2 text-center">
                  {getStatusBadge(task.status)}
                </td>
                <td className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400">
                  {formatDate(task.createdAt)}
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {task.status === "pending" && (
                      <button
                        onClick={() => onCancel(task._id)}
                        className="px-3 py-1 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                        title="Cancel task"
                      >
                        Cancel
                      </button>
                    )}
                    {[
                      "cancelled",
                      "completed",
                      "failed",
                    ].includes(task.status) && (
                      <button
                        onClick={() => onDelete(task._id)}
                        className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete task"
                      >
                        Delete
                      </button>
                    )}
                    {task.status === "running" && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                        In progress...
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-2">
          <button
            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <span className="text-xs">Page {page} of {totalPages}</span>
          <button
            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default ScheduledTasksTable;