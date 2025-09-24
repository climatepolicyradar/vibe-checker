"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import Breadcrumb from "@/components/Breadcrumb";
import ExternalLink from "@/components/ExternalLink";
import MaterialIcon from "@/components/MaterialIcon";

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
        <Breadcrumb href="/">Back to all concepts</Breadcrumb>

        {/* Header section */}
        <div className="card mb-6 p-6">
          <div className="flex flex-col gap-2">
            <h1 className="page-title">
              {conceptId}
            </h1>
            <div>
              <ExternalLink
                href={`https://climatepolicyradar.wikibase.cloud/wiki/Item:${conceptId}`}
                className="text-sm text-secondary hover:text-primary"
              >
                View in Wikibase
              </ExternalLink>
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
                    <MaterialIcon name="chevron_right" size={20} className="text-secondary" />
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

      </div>
    </div>
  );
}