"use client";

import PredictionFilters, { FilterState } from "@/components/PredictionFilters";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import PaginationControls from "@/components/PaginationControls";

interface PredictionsPageClientProps {
  conceptId: string;
  classifierId: string;
}

export default function PredictionsPageClient({
  conceptId,
  classifierId,
}: PredictionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // API response state
  const [pageSize, setPageSize] = useState<number>(0); // Will be inferred from results
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [totalUnfiltered, setTotalUnfiltered] = useState<number>(0);
  const [availableCorpusTypes, setAvailableCorpusTypes] = useState<string[]>(
    [],
  );
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  // Search state for debounced input
  const [localSearchTerms, setLocalSearchTerms] = useState<string>("");
  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Concept metadata
  const [conceptData, setConceptData] = useState<{
    preferred_label?: string;
    description?: string;
  }>({});

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

  // Memoize URL-derived state to prevent unnecessary re-renders
  const urlState = useMemo(() => {
    const page = parseInt(searchParams.get("page") || "1");
    const filters: FilterState = {
      translated: searchParams.get("translated")
        ? searchParams.get("translated") === "true"
        : undefined,
      corpus_type: searchParams.get("corpus_type") || undefined,
      world_bank_region: searchParams.get("world_bank_region") || undefined,
      publication_year_start: searchParams.get("publication_year_start")
        ? parseInt(searchParams.get("publication_year_start")!)
        : undefined,
      publication_year_end: searchParams.get("publication_year_end")
        ? parseInt(searchParams.get("publication_year_end")!)
        : undefined,
      document_id: searchParams.get("document_id") || undefined,
    };
    const searchTerms = searchParams.get("search") || undefined;
    return { page, filters, searchTerms };
  }, [searchParams]);

  // Memoized URL update function
  const updateURL = useCallback(
    (newFilters: FilterState, newPage: number, searchTerms?: string) => {
      const params = new URLSearchParams();

      // Add page
      if (newPage > 1) {
        params.set("page", newPage.toString());
      }

      // Add filters
      if (newFilters.translated !== undefined) {
        params.set("translated", newFilters.translated.toString());
      }
      if (newFilters.corpus_type) {
        params.set("corpus_type", newFilters.corpus_type);
      }
      if (newFilters.world_bank_region) {
        params.set("world_bank_region", newFilters.world_bank_region);
      }
      if (newFilters.publication_year_start) {
        params.set(
          "publication_year_start",
          newFilters.publication_year_start.toString(),
        );
      }
      if (newFilters.publication_year_end) {
        params.set(
          "publication_year_end",
          newFilters.publication_year_end.toString(),
        );
      }
      if (newFilters.document_id) {
        params.set("document_id", newFilters.document_id);
      }
      if (searchTerms) {
        params.set("search", searchTerms);
      }

      const newURL = params.toString()
        ? `/${conceptId}/${classifierId}?${params.toString()}`
        : `/${conceptId}/${classifierId}`;

      router.replace(newURL);
    },
    [conceptId, classifierId, router],
  );

  // Search-specific update function
  const updateSearch = useCallback(
    (newSearchTerms: string) => {
      updateURL(urlState.filters, 1, newSearchTerms); // Reset to page 1 on search
    },
    [updateURL, urlState.filters],
  );

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearchTerms(value);

      // Clear existing timeout
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }

      // Set new timeout for search update
      searchDebounceTimeoutRef.current = setTimeout(() => {
        updateSearch(value || "");
      }, 500); // Longer debounce for search
    },
    [updateSearch],
  );

  // Update local search state when URL changes
  useEffect(() => {
    setLocalSearchTerms(urlState.searchTerms || "");
  }, [urlState.searchTerms]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, []);

  // Fetch concept metadata first
  useEffect(() => {
    const fetchConceptData = async () => {
      try {
        const response = await fetch(`/api/concepts`);
        const result = await response.json();
        if (result.success && result.data) {
          const concept = result.data.find(
            (c: {
              wikibase_id: string;
              preferred_label?: string;
              description?: string;
            }) => c.wikibase_id === conceptId,
          );
          if (concept) {
            setConceptData({
              preferred_label: concept.preferred_label,
              description: concept.description,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch concept data:", error);
      }
    };

    if (conceptId) {
      fetchConceptData();
    }
  }, [conceptId]);

  // Fetch predictions based on URL state
  useEffect(() => {
    const fetchPredictions = async () => {
      if (!conceptId || !classifierId) return;

      setLoading(true);
      try {
        const { page, filters, searchTerms } = urlState;

        const params = new URLSearchParams();
        params.set("page", page.toString());
        if (searchTerms) {
          params.set("search", searchTerms);
        }

        // Add filter parameters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            params.set(key, value.toString());
          }
        });

        const queryString = params.toString();
        const response = await fetch(
          `/api/predictions/${conceptId}/${classifierId}?${queryString}`,
        );
        const result = await response.json();

        if (result.success) {
          setPredictions(result.data);

          // Infer page size from results
          if (result.data && result.data.length > 0) {
            setPageSize(result.data.length);
          }

          // Update pagination state
          if (result.pagination) {
            setHasNextPage(result.pagination.hasNextPage);
            setHasPreviousPage(result.pagination.hasPreviousPage);
            setTotalFiltered(result.pagination.totalFiltered);
            setTotalUnfiltered(result.pagination.totalUnfiltered);
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

    fetchPredictions();
  }, [conceptId, classifierId, urlState, pageSize]);

  // Memoized event handlers
  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      const newPage = 1; // Reset to first page when filters change
      updateURL(newFilters, newPage, urlState.searchTerms);
    },
    [updateURL, urlState.searchTerms],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateURL(urlState.filters, newPage, urlState.searchTerms);
    },
    [updateURL, urlState.filters, urlState.searchTerms],
  );

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
                <span className="text-secondary"> / </span>
                <span className="text-primary">{classifierId}</span>
              </h1>

              {/* Concept metadata */}
              {(conceptData.preferred_label || conceptData.description) && (
                <div className="mt-3 space-y-1">
                  {conceptData.preferred_label && (
                    <div className="text-primary text-lg font-medium">
                      {conceptData.preferred_label}
                    </div>
                  )}
                  {conceptData.description && (
                    <div className="text-secondary text-sm">
                      {conceptData.description}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3">
                <a
                  href={`https://climatepolicyradar.wikibase.cloud/wiki/Item:${conceptId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary hover:text-primary text-sm transition-colors"
                >
                  View in Wikibase →
                </a>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Input */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={localSearchTerms}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="input w-full pl-10 pr-4 py-2 text-sm"
                    placeholder="Search in passage text..."
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 text-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  {localSearchTerms && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Download Button */}
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

            {/* Filters */}
            <PredictionFilters
              filters={urlState.filters}
              onFilterChange={handleFilterChange}
              availableCorpusTypes={availableCorpusTypes}
              availableRegions={availableRegions}
              totalFiltered={totalFiltered}
              totalUnfiltered={totalUnfiltered}
              searchTerms={urlState.searchTerms}
            />
          </div>
        </div>

        {/* Pagination controls */}
        {!loading && !error && (
          <PaginationControls
            page={urlState.page}
            totalFiltered={totalFiltered}
            pageSize={pageSize}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onPageChange={handlePageChange}
          />
        )}

        {loading && <LoadingSpinner message="Loading predictions..." />}

        {error && (
          <div className="card mb-6 border-red-200 bg-red-50 p-4">
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
                  <div className="text-secondary mb-2 text-sm">
                    {metadata.document_id} | Page{" "}
                    {metadata["text_block.page_number"]}
                  </div>
                  <div className="passage-text text-primary leading-relaxed">
                    {prediction.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom pagination controls */}
        {!loading && !error && (
          <div className="mt-6">
            <PaginationControls
              page={urlState.page}
              totalFiltered={totalFiltered}
              pageSize={pageSize}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
