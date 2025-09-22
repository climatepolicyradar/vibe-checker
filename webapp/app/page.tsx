"use client";

import { useEffect, useState } from "react";
import Card from "../components/Card";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Input from "../components/Input";

interface ConceptData {
  id: string;
  name: string;
  description?: string;
}

export default function Home() {
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [filteredConcepts, setFilteredConcepts] = useState<ConceptData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const fetchConcepts = async () => {
      try {
        const response = await fetch("/api/concepts");
        const result = await response.json();

        if (result.success) {
          // Transform the data to include names and descriptions
          const conceptData: ConceptData[] = result.data.map((id: string) => ({
            id,
            name: id, // For now, use ID as name - could be enhanced to fetch actual concept names
            description: `Concept ${id} - View available classifiers and predictions`,
          }));
          setConcepts(conceptData);
          setFilteredConcepts(conceptData);
        } else {
          throw new Error(result.error || "Failed to fetch concepts");
        }
      } catch (err) {
        console.error("Error fetching concepts:", err);
        setError(
          `Failed to fetch concepts: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchConcepts();
  }, []);

  // Filter concepts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConcepts(concepts);
    } else {
      const filtered = concepts.filter(
        (concept) =>
          concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          concept.id.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredConcepts(filtered);
    }
  }, [searchTerm, concepts]);

  return (
    <div className="min-h-screen p-6 bg-neutral-0 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex w-full items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Vibe Checker
            </h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Check predictions from candidate classifiers
            </p>
          </div>
          <div className="w-full max-w-sm min-w-[200px] ml-auto">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a concept"
              hasIcon
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="h-4 w-4 text-neutral-600 dark:text-neutral-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              }
              className="h-10"
            />
          </div>
        </div>

        {loading && <LoadingSpinner message="Loading concepts..." />}

        {error && <ErrorMessage error={error} />}

        {!loading && !error && (
          <Card className="overflow-hidden">
            <table className="w-full table-auto text-left">
              <thead>
                <tr>
                  <th className="bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600 w-48 p-4">
                    <p className="text-neutral-600 dark:text-neutral-300 text-sm font-medium">
                      Concept
                    </p>
                  </th>
                  <th className="bg-neutral-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600 p-4">
                    <p className="text-neutral-600 dark:text-neutral-300 text-sm font-medium">
                      Description
                    </p>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredConcepts.map((concept) => (
                  <tr
                    key={concept.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                    onClick={() => (window.location.href = `/${concept.id}`)}
                  >
                    <td className="border-b border-neutral-200 dark:border-neutral-600 p-4">
                      <p className="text-neutral-900 dark:text-neutral-100 break-words font-medium">{concept.name}</p>
                    </td>
                    <td className="border-b border-neutral-200 dark:border-neutral-600 p-4">
                      <p className="text-neutral-600 dark:text-neutral-400 break-words text-sm">
                        {concept.description}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredConcepts.length === 0 && concepts.length > 0 && (
              <div className="p-12 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">
                  No concepts found matching &quot;<span className="font-medium">{searchTerm}</span>&quot;
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
