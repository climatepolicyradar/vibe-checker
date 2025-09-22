interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({
  message = "Loading...",
  className = "py-12"
}: LoadingSpinnerProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-600 dark:border-t-neutral-100 rounded-full animate-spin"></div>
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        {message}
      </p>
    </div>
  );
}