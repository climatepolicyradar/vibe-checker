import Card from "./Card";

interface ErrorMessageProps {
  error: string;
  className?: string;
}

export default function ErrorMessage({ error, className = "mb-6" }: ErrorMessageProps) {
  return (
    <Card variant="error" className={`p-4 ${className}`}>
      <div className="text-neutral-900 dark:text-neutral-100">
        <strong className="font-medium">Error:</strong> {error}
      </div>
    </Card>
  );
}