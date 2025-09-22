interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasIcon?: boolean;
  icon?: React.ReactNode;
}

export default function Input({ hasIcon, icon, className = "", ...props }: InputProps) {
  const baseClasses = "rounded-md border bg-white text-neutral-900 placeholder-neutral-500 transition-colors focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:hover:border-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400";

  const paddingClasses = hasIcon ? "pl-3 pr-11" : "px-3";
  const borderClasses = "border-neutral-300 hover:border-neutral-400";

  if (hasIcon) {
    return (
      <div className="relative">
        <input
          className={`${baseClasses} ${borderClasses} ${paddingClasses} py-2 w-full ${className}`}
          {...props}
        />
        {icon && (
          <div className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-neutral-800">
            {icon}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      className={`${baseClasses} ${borderClasses} ${paddingClasses} py-2 ${className}`}
      {...props}
    />
  );
}