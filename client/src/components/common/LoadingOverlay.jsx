function LoadingOverlay({
  show,
  title = "Processing",
  message = "Please wait while the operation completes",
  subMessage = "This may take several minutes",
  warning = "Please do not close or refresh this page during the operation",
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center shadow-2xl max-w-md w-full mx-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-t-4 border-orange-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 animate-pulse"></div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
            <span className="inline-flex ml-1">
              <span className="animate-bounce">.</span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "150ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "300ms" }}
              >
                .
              </span>
            </span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {subMessage}
          </p>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg w-full">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              {warning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
