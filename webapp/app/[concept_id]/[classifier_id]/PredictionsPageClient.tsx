"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PredictionFilters, { FilterState } from "@/components/PredictionFilters";

interface PredictionsPageClientProps {
  conceptId: string;
  classifierId: string;
}

export default function PredictionsPageClient({
  conceptId,
  classifierId,
}: PredictionsPageClientProps) {
  // Initialize page and pageSize
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);

  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({});
  const [availableCorpusTypes, setAvailableCorpusTypes] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  interface Prediction {
    text: string;
    spans?: Array<{ start: number; end: number; label: string }>;
    metadata: {
      "text_block.text_block_id": string;
      "text_block.page_number": string;
      document_id: string;
      translated: string;
      "document_metadata.publication_ts": string;
      "document_metadata.corpus_type_name": string;
      document_slug: string;
      world_bank_region: string;
      similarity: string;
    };
  }

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const buildQueryParams = () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());

      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, value.toString());
        }
      });

      return params.toString();
    };

    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const queryString = buildQueryParams();
        const response = await fetch(
          `/api/predictions/${conceptId}/${classifierId}?${queryString}`,
        );
        const result = await response.json();

        if (result.success) {
          setPredictions(result.data);

          // Update pagination state
          if (result.pagination) {
            setHasNextPage(result.pagination.hasNextPage);
            setHasPreviousPage(result.pagination.hasPreviousPage);
            setTotalFiltered(result.pagination.totalFiltered);
          }

          // Update available filter options
          if (result.filters) {
            setAvailableCorpusTypes(result.filters.availableCorpusTypes || []);
            setAvailableRegions(result.filters.availableRegions || []);
          }
        } else {
          throw new Error(result.error || "Failed to fetch predictions");
        }
      } catch (err) {
        console.error("Error fetching predictions:", err);
        setError(
          `Failed to fetch predictions: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setLoading(false);
      }
    };

    if (conceptId && classifierId) {
      fetchPredictions();
    }
  }, [conceptId, classifierId, page, pageSize, filters]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  return (
    <div className="page-container">
      <div className="mx-auto max-w-7xl">
        <div className="card mb-6 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="page-title">
                <Link
                  href={`/${conceptId}`}
                  className="text-accent-primary transition-colors hover:text-accent-secondary"
                >
                  {conceptId}
                </Link>
                <span className="text-secondary">
                  {" "}
                  /{" "}
                </span>
                <span className="text-primary">
                  {classifierId}
                </span>
              </h1>
              <div className="mt-2">
                <a
                  href="#"
                  target="_blank"
                  className="text-sm text-secondary transition-colors hover:text-primary"
                >
                  View in Wikibase →
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#"
                title="Download JSON"
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-download"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download JSON
              </a>
            </div>
          </div>
        </div>

        {/* Filters */}
        <PredictionFilters
          onFilterChange={handleFilterChange}
          availableCorpusTypes={availableCorpusTypes}
          availableRegions={availableRegions}
        />

        {/* Pagination and controls */}
        <div className="card mb-6 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="input w-full lg:w-auto"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!hasPreviousPage}
                className={`w-full lg:w-auto ${
                  hasPreviousPage
                    ? "btn-primary"
                    : "btn-secondary cursor-not-allowed opacity-50"
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-secondary lg:mx-2">
                Page {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
                className={`w-full lg:w-auto ${
                  hasNextPage
                    ? "btn-primary"
                    : "btn-secondary cursor-not-allowed opacity-50"
                }`}
              >
                Next
              </button>
            </div>
            <div className="flex gap-2">
              <button
                id="shuffle"
                className="btn-primary w-full lg:w-auto"
              >
                Shuffle Passages
              </button>
              <button
                id="sortLength"
                className="btn-primary w-full lg:w-auto"
              >
                Sort by Length (↓)
              </button>
            </div>
          </div>
        </div>

        {/* Count display */}
        <div className="mb-4 text-sm font-medium text-secondary">
          Showing{" "}
          <span id="visible-count" className="font-mono">
            {predictions.length}
          </span>{" "}
          of <span className="font-mono">{totalFiltered}</span> filtered
          passages
        </div>

        {loading && (
          <div className="py-8 text-center">
            <p className="text-secondary">
              Loading predictions...
            </p>
          </div>
        )}

        {error && (
          <div className="card mb-6 p-4 border-red-200 bg-red-50">
            <div className="text-primary">
              <strong className="font-medium">Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Passages container */}
        {!loading && !error && predictions.length > 0 && (
          <div id="passages-container" className="space-y-4">
            {predictions.map((prediction, index) => {
              const metadata = prediction.metadata;
              const pubDate = new Date(
                metadata["document_metadata.publication_ts"],
              );

              return (
                <div
                  key={index}
                  className="passage-card card p-6 transition duration-300 hover:shadow-md"
                >
                  <div className="mb-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-bg-tertiary px-2 py-1 text-text-primary">
                      {metadata["document_metadata.corpus_type_name"]}
                    </span>
                    <span className="rounded bg-bg-tertiary px-2 py-1 text-text-primary">
                      {metadata.world_bank_region}
                    </span>
                    <span className="rounded bg-bg-tertiary px-2 py-1 text-text-primary">
                      {metadata.translated === "True"
                        ? "Translated"
                        : "Original"}
                    </span>
                    <span className="rounded bg-bg-tertiary px-2 py-1 text-text-primary">
                      {pubDate.getFullYear()}
                    </span>
                  </div>
                  <div className="mb-2 text-sm text-secondary">
                    {metadata.document_id} | Page{" "}
                    {metadata["text_block.page_number"]}
                  </div>
                  <div className="passage-text leading-relaxed text-primary">
                    {prediction.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}