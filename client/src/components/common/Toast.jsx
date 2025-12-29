const variants = {
  success: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  error: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  processing: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
};

function Toast({ type = "success", message, onClose }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-120">
      <div
        role="status"
        aria-live="polite"
        className={`px-4 py-3 rounded-lg shadow-md min-w-[280px] text-sm flex items-start gap-3 ${variants[type]}`}
      >
        <span className="mt-0.5">
          {type === "success" && "✅"}
          {type === "error" && "❌"}
          {type === "processing" && "⏳"}
        </span>
        <span className="flex-1">{message}</span>
        <button
          aria-label="Dismiss notification"
          onClick={() => onClose?.()}
          className="ml-2 opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Toast;
