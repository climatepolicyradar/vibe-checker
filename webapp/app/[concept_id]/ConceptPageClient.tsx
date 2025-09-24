"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import Breadcrumb from "@/components/Breadcrumb";
import ConceptHeader from "@/components/ConceptHeader";
import MaterialIcon from "@/components/MaterialIcon";

interface ClassifierData {
  id: string;
  string: string;
  name: string;
  date: string;
}

interface ClassifierInfo {
  id: string;
  data?: ClassifierData;
  loading: boolean;
  error?: string;
}

interface ConceptData {
  preferred_label?: string;
  description?: string;
}

interface ConceptPageClientProps {
  conceptId: string;
}

export default function ConceptPageClient({ conceptId }: ConceptPageClientProps) {
  const [classifiers, setClassifiers] = useState<ClassifierInfo[]>([]);
  const [conceptData, setConceptData] = useState<ConceptData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchClassifiers = async () => {
      try {
        const response = await fetch(`/api/concepts/${conceptId}/classifiers`);
        const result = await response.json();

        if (result.success) {
          // Initialize classifiers with loading state
          const classifierInfos: ClassifierInfo[] = result.data.map((id: string) => ({
            id,
            loading: true,
          }));
          setClassifiers(classifierInfos);

          // Fetch detailed data for each classifier and concept metadata
          classifierInfos.forEach(async (classifierInfo, index) => {
            try {
              const classifierResponse = await fetch(
                `/api/concepts/${conceptId}/classifiers/${classifierInfo.id}`
              );
              const classifierResult = await classifierResponse.json();

              if (classifierResult.success) {
                setClassifiers(prev =>
                  prev.map((c, i) =>
                    i === index
                      ? { ...c, data: classifierResult.data, loading: false }
                      : c
                  )
                );
              } else {
                setClassifiers(prev =>
                  prev.map((c, i) =>
                    i === index
                      ? { ...c, error: classifierResult.error, loading: false }
                      : c
                  )
                );
              }
            } catch (err) {
              setClassifiers(prev =>
                prev.map((c, i) =>
                  i === index
                    ? {
                        ...c,
                        error: err instanceof Error ? err.message : "Unknown error",
                        loading: false
                      }
                    : c
                )
              );
            }
          });

          // Fetch concept metadata from the first classifier
          if (classifierInfos.length > 0) {
            try {
              const conceptResponse = await fetch(
                `/api/concepts/${conceptId}/classifiers/${classifierInfos[0].id}`
              );
              const conceptResult = await conceptResponse.json();

              if (conceptResult.success) {
                // Fetch the concept.json file to get metadata
                const conceptJsonResponse = await fetch(
                  `/api/predictions/${conceptId}/${classifierInfos[0].id}?page=1`
                );
                const conceptJsonResult = await conceptJsonResponse.json();

                if (conceptJsonResult.success) {
                  // Extract concept data from the predictions response metadata or try the concept endpoint
                  const conceptsResponse = await fetch('/api/concepts');
                  const conceptsResult = await conceptsResponse.json();

                  if (conceptsResult.success) {
                    const concept = conceptsResult.data.find((c: any) => c.wikibase_id === conceptId);
                    if (concept) {
                      setConceptData({
                        preferred_label: concept.preferred_label,
                        description: concept.description,
                      });
                    }
                  }
                }
              }
            } catch (err) {
              console.error("Error fetching concept metadata:", err);
            }
          }
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

        <ConceptHeader
          conceptId={conceptId}
          conceptData={conceptData}
        />

        {loading && <LoadingSpinner message="Loading classifiers..." />}

        {error && (
          <div className="card mb-6 p-4 border-red-200 bg-red-50">
            <div className="text-primary">
              <strong className="font-medium">Error:</strong> {error}
            </div>
          </div>
        )}

        {!loading && !error && classifiers.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full table-auto text-left">
              <thead>
                <tr>
                  <th className="w-40 border-b border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-700">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      ID
                    </p>
                  </th>
                  <th className="hidden border-b border-neutral-200 bg-neutral-50 p-4 md:table-cell dark:border-neutral-600 dark:bg-neutral-700">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Name
                    </p>
                  </th>
                  <th className="w-32 border-b border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-700">
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      Created
                    </p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {classifiers.map((classifier) => (
                  <tr
                    key={classifier.id}
                    className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    onClick={() => (window.location.href = `/${conceptId}/${classifier.id}`)}
                  >
                    <td className="border-b border-neutral-200 p-4 dark:border-neutral-600">
                      <div className="flex items-center gap-2">
                        <p className="font-medium break-words text-neutral-900 dark:text-neutral-100">
                          {classifier.id}
                        </p>
                        {classifier.loading && (
                          <MaterialIcon
                            name="progress_activity"
                            size={16}
                            className="text-neutral-400 animate-spin"
                          />
                        )}
                      </div>
                    </td>
                    <td className="hidden border-b border-neutral-200 p-4 md:table-cell dark:border-neutral-600">
                      {classifier.data ? (
                        <p className="text-sm break-words text-neutral-600 dark:text-neutral-400">
                          {classifier.data.name}
                        </p>
                      ) : classifier.error ? (
                        <p className="text-sm text-red-600">
                          Failed to load
                        </p>
                      ) : classifier.loading ? (
                        <p className="text-sm text-neutral-400">
                          Loading...
                        </p>
                      ) : (
                        <p className="text-sm text-neutral-400">
                          —
                        </p>
                      )}
                    </td>
                    <td className="border-b border-neutral-200 p-4 dark:border-neutral-600">
                      {classifier.data ? (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {new Date(classifier.data.date).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm text-neutral-400">
                          —
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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