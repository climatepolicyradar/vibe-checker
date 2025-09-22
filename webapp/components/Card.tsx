interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "error";
}

export default function Card({ children, className = "", variant = "default" }: CardProps) {
  const baseClasses = "rounded-lg border shadow-sm";

  const variantClasses = {
    default: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800",
    error: "border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}