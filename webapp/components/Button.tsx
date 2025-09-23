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
    md: "px-3 py-2",
  };

  const variantClasses = {
    primary: disabled
      ? "cursor-not-allowed border-border-secondary bg-bg-tertiary text-text-tertiary opacity-50"
      : "border-accent-primary bg-accent-primary text-text-inverse hover:bg-accent-secondary hover:border-accent-secondary",
    secondary: disabled
      ? "cursor-not-allowed border-border-secondary bg-bg-tertiary text-text-tertiary opacity-50"
      : "border-border-secondary bg-bg-primary text-text-primary hover:border-border-tertiary hover:bg-interactive-hover focus:border-accent-primary focus:ring-1 focus:ring-accent-primary",
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
