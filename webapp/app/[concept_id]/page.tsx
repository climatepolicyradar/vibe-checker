"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ConceptPage() {
  const params = useParams();
  const conceptId = params.concept_id as string;

  const [classifiers, setClassifiers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchClassifiers = async () => {
      try {
        const response = await fetch(`/api/concepts/${conceptId}/classifiers`);
        const result = await response.json();

        if (result.success) {
          setClassifiers(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch classifiers");
        }
      } catch (err) {
        console.error("Error fetching classifiers:", err);
        setError(
          `Failed to fetch classifiers: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setLoading(false);
      }
    };

    if (conceptId) {
      fetchClassifiers();
    }
  }, [conceptId]);

  return (
    <div className="bg-neutral-0 min-h-screen p-6 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        {/* Header section */}
        <div className="bg-neutral-0 mb-6 rounded-lg border border-neutral-200 p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {conceptId}
            </h1>
            <div>
              <a
                href="#"
                target="_blank"
                className="text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                View in Wikibase →
              </a>
            </div>
          </div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-600 dark:border-t-neutral-100"></div>
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              Loading classifiers...
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

        {!loading && !error && classifiers.length > 0 && (
          <div className="bg-neutral-0 rounded-lg border border-neutral-200 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <div className="border-b border-neutral-200 p-6 dark:border-neutral-700">
              <h2 className="font-serif text-lg font-medium text-neutral-900 dark:text-neutral-100">
                Available Classifiers
              </h2>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {classifiers.map((classifierId) => (
                <Link
                  key={classifierId}
                  href={`/${conceptId}/${classifierId}`}
                  className="block p-6 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {classifierId}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-neutral-500 dark:text-neutral-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && classifiers.length === 0 && (
          <div className="bg-neutral-0 rounded-lg border border-neutral-200 p-12 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <div className="text-neutral-600 dark:text-neutral-400">
              <p>
                No classifiers found for concept{" "}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {conceptId}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Back to index link */}
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
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
            Back to all concepts
          </Link>
        </div>
      </div>
    </div>
  );
}
