interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "error";
}

export default function Card({
  children,
  className = "",
  variant = "default",
}: CardProps) {
  const baseClasses = "rounded-lg border shadow-sm";

  const variantClasses = {
    default: "border-border-primary bg-bg-primary",
    error: "border-red-200 bg-red-50",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
