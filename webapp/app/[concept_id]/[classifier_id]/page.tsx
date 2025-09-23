"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import Link from "next/link";

export default function PredictionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const conceptId = params.concept_id as string;
  const classifierId = params.classifier_id as string;

  // Initialize page and pageSize from URL query params
  const [page, setPage] = useState<number>(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const pageSizeParam = searchParams.get("pageSize");
    return pageSizeParam ? parseInt(pageSizeParam, 10) : 100;
  });

  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);

  interface Prediction {
    text: string;
    spans?: Array<{ start: number; end: number; label: string }>;
  }

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [s3Uri, setS3Uri] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch(
          `/api/predictions/${conceptId}/${classifierId}?page=${page}&pageSize=${pageSize}`,
        );
        const result = await response.json();

        if (result.success) {
          // Data is already parsed as an array of objects
          setPredictions(result.data);
          setS3Uri(result.s3Uri);

          // Update pagination state
          if (result.pagination) {
            setHasNextPage(result.pagination.hasNextPage);
            setHasPreviousPage(result.pagination.hasPreviousPage);
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
  }, [conceptId, classifierId, page, pageSize]);

  return (
    <div className="bg-neutral-0 min-h-screen p-6 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="bg-neutral-0 mb-6 rounded-lg border border-neutral-200 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                <Link
                  href={`/${conceptId}`}
                  className="text-accent-primary transition-colors hover:text-accent-secondary"
                >
                  {conceptId}
                </Link>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {" "}
                  /{" "}
                </span>
                <span className="text-neutral-700 dark:text-neutral-200">
                  {classifierId}
                </span>
              </h1>
              <div className="mt-2">
                <a
                  href="#"
                  target="_blank"
                  className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  View in Wikibase →
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#"
                title="Download JSON"
                className="bg-neutral-0 flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
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

            {/* Search and filters */}
            <div className="w-full lg:w-[500px]">
              <div className="group relative">
                <input
                  type="text"
                  id="search"
                  placeholder="Search passages"
                  title="Basic search is case-insensitive. Use /pattern/i for case-insensitive regex, or /pattern/ for case-sensitive regex"
                  className="bg-neutral-0 h-12 w-full rounded-md border border-neutral-300 py-2 pr-11 pl-4 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-500 hover:border-neutral-400 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:hover:border-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                />
                <div className="bg-neutral-0 absolute left-0 z-10 mt-1 hidden w-80 rounded-lg border border-neutral-200 p-4 shadow-lg group-hover:block dark:border-neutral-700 dark:bg-neutral-800">
                  <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">
                    Search Examples:
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700">
                        <td className="py-1 pr-4">climate</td>
                        <td className="text-neutral-600 dark:text-neutral-400">
                          Find passages containing &quot;climate&quot;
                        </td>
                      </tr>
                      <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700">
                        <td className="py-1 pr-4">/pattern/i</td>
                        <td className="text-neutral-600 dark:text-neutral-400">
                          Case-insensitive regex
                        </td>
                      </tr>
                      <tr className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700">
                        <td className="py-1 pr-4">/pattern/</td>
                        <td className="text-neutral-600 dark:text-neutral-400">
                          Case-sensitive regex
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pagination and controls */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                  className="bg-neutral-0 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 lg:w-auto dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={!hasPreviousPage}
                  className={`w-full rounded-md border px-3 py-2 transition-colors lg:w-auto ${
                    hasPreviousPage
                      ? "bg-neutral-0 border-neutral-300 text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                      : "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-600 lg:mx-2 dark:text-neutral-400">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNextPage}
                  className={`w-full rounded-md border px-3 py-2 transition-colors lg:w-auto ${
                    hasNextPage
                      ? "bg-neutral-0 border-neutral-300 text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                      : "cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  id="shuffle"
                  className="bg-neutral-0 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 lg:w-auto dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                >
                  Shuffle Passages
                </button>
                <button
                  id="sortLength"
                  className="bg-neutral-0 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 lg:w-auto dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-700 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                >
                  Sort by Length (↓)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Count display */}
        <div className="mb-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Showing{" "}
          <span id="visible-count" className="font-mono">
            {predictions.length}
          </span>{" "}
          of <span className="font-mono">{predictions.length}</span> passages
        </div>

        {loading && (
          <div className="py-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Loading predictions...
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-neutral-300 bg-neutral-100 p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <div className="text-neutral-900 dark:text-neutral-100">
              <strong className="font-medium">Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Passages container */}
        {!loading && !error && predictions.length > 0 && (
          <div id="passages-container" className="space-y-4">
            {predictions.map((prediction, index) => {
              const hasSpans = prediction.spans && prediction.spans.length > 0;
              return (
                <div
                  key={index}
                  className="passage-card bg-neutral-0 rounded-lg border border-neutral-200 p-6 shadow-sm transition duration-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <div className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                    Passage {index + 1} | No metadata available
                  </div>
                  <div className="passage-text leading-relaxed text-neutral-900 dark:text-neutral-100">
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
