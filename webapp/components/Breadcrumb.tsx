import Link from "next/link";

interface BreadcrumbProps {
  href: string;
  children: React.ReactNode;
}

export default function Breadcrumb({ href, children }: BreadcrumbProps) {
  return (
    <div className="mb-6">
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm text-secondary transition-colors hover:text-primary"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {children}
      </Link>
    </div>
  );
}