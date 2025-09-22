interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = "rounded-md border transition-colors font-medium";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2"
  };

  const variantClasses = {
    primary: disabled
      ? "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
      : "border-neutral-900 bg-neutral-900 text-neutral-0 hover:bg-neutral-700 hover:border-neutral-700 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:hover:border-neutral-200",
    secondary: disabled
      ? "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
      : "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
  };

  const widthClass = fullWidth ? "w-full" : "w-auto";

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}