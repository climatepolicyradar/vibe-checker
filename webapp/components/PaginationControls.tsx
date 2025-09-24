interface PaginationControlsProps {
  page: number;
  totalFiltered: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (newPage: number) => void;
}

export default function PaginationControls({
  page,
  totalFiltered,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: PaginationControlsProps) {
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalFiltered);

  return (
    <div className="card mb-6 p-4">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!hasPreviousPage}
          className={`${
            hasPreviousPage
              ? "btn-primary"
              : "btn-secondary cursor-not-allowed opacity-50"
          }`}
        >
          Previous
        </button>

        <div className="text-sm font-medium text-secondary">
          {totalFiltered > 0
            ? `${startIndex}-${endIndex} of ${totalFiltered}`
            : "0 of 0"
          }
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className={`${
            hasNextPage
              ? "btn-primary"
              : "btn-secondary cursor-not-allowed opacity-50"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}