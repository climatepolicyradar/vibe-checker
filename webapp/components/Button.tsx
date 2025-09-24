interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  fullWidth?: boolean;
  loading?: boolean;
  render?: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => React.ReactElement;
}

export default function Button({
  children,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  disabled,
  loading = false,
  className = "",
  render,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseClasses = "rounded-md border transition-all duration-200 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2",
  };

  const variantClasses = {
    primary: isDisabled
      ? "cursor-not-allowed border-border-secondary bg-bg-tertiary text-text-tertiary opacity-50"
      : "border-accent-primary bg-accent-primary text-text-inverse hover:bg-accent-secondary hover:border-accent-secondary active:scale-[0.98] transform",
    secondary: isDisabled
      ? "cursor-not-allowed border-border-secondary bg-bg-tertiary text-text-tertiary opacity-50"
      : "border-border-secondary bg-bg-primary text-text-primary hover:border-border-tertiary hover:bg-interactive-hover focus:border-accent-primary focus:ring-1 focus:ring-accent-primary active:scale-[0.98] transform",
  };

  const widthClass = fullWidth ? "w-full" : "w-auto";

  const buttonProps = {
    className: `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`,
    disabled: isDisabled,
    "data-loading": loading,
    "aria-busy": loading,
    ...props,
  };

  const buttonContent = (
    <>
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </>
  );

  if (render) {
    return render({
      ...buttonProps,
      children: buttonContent,
    });
  }

  return (
    <button {...buttonProps}>
      {buttonContent}
    </button>
  );
}
