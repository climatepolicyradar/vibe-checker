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
          }`
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
    <div className="min-h-screen p-6 bg-neutral-0 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto">
        {/* Header section */}
        <div className="bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {conceptId}
            </h1>
            <div>
              <a
                href="#"
                target="_blank"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                View in Wikibase →
              </a>
            </div>
          </div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-600 dark:border-t-neutral-100 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              Loading classifiers...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-4 mb-6">
            <div className="text-neutral-900 dark:text-neutral-100">
              <strong className="font-medium">Error:</strong> {error}
            </div>
          </div>
        )}

        {!loading && !error && classifiers.length > 0 && (
          <div className="bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="font-serif text-lg font-medium text-neutral-900 dark:text-neutral-100">
                Available Classifiers
              </h2>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {classifiers.map((classifierId) => (
                <Link
                  key={classifierId}
                  href={`/${conceptId}/${classifierId}`}
                  className="block p-6 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">
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
          <div className="bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-12 text-center">
            <div className="text-neutral-600 dark:text-neutral-400">
              <p>No classifiers found for concept <span className="font-medium text-neutral-900 dark:text-neutral-100">{conceptId}</span></p>
            </div>
          </div>
        )}

        {/* Back to index link */}
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to all concepts
          </Link>
        </div>
      </div>
    </div>
  );
}
