"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ConceptPageClientProps {
  conceptId: string;
}

export default function ConceptPageClient({ conceptId }: ConceptPageClientProps) {
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
    <div className="page-container">
      <div className="mx-auto max-w-7xl">
        {/* Header section */}
        <div className="card mb-6 p-6">
          <div className="flex flex-col gap-2">
            <h1 className="page-title">
              {conceptId}
            </h1>
            <div>
              <a
                href="#"
                target="_blank"
                className="text-sm text-secondary transition-colors hover:text-primary"
              >
                View in Wikibase →
              </a>
            </div>
          </div>
        </div>

        {loading && <LoadingSpinner message="Loading classifiers..." />}

        {error && (
          <div className="card mb-6 p-4 border-red-200 bg-red-50">
            <div className="text-primary">
              <strong className="font-medium">Error:</strong> {error}
            </div>
          </div>
        )}

        {!loading && !error && classifiers.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="font-serif text-lg font-medium text-primary">
                Available Classifiers
              </h2>
            </div>

            <div className="divide-y divide-border-primary">
              {classifiers.map((classifierId) => (
                <Link
                  key={classifierId}
                  href={`/${conceptId}/${classifierId}`}
                  className="block p-6 transition-colors hover:bg-interactive-hover"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-primary">
                      {classifierId}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-secondary"
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
          <div className="card p-12 text-center">
            <div className="text-secondary">
              <p>
                No classifiers found for concept{" "}
                <span className="font-medium text-primary">
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
            Back to all concepts
          </Link>
        </div>
      </div>
    </div>
  );
}