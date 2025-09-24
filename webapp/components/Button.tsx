import MaterialIcon from "@/components/MaterialIcon";

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
        <MaterialIcon name="progress_activity" size={16} className="mr-2 animate-spin" />
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
