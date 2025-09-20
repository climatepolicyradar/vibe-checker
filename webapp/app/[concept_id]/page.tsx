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
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/"
          style={{
            color: "#666",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          ← Back to all concepts
        </Link>
      </div>

      <h1>Concept: {conceptId}</h1>
      <p>Select a classifier to view predictions:</p>

      {loading && <p>Loading classifiers...</p>}

      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && classifiers.length > 0 && (
        <div>
          <h2>Available Classifiers:</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {classifiers.map((classifierId) => (
              <li key={classifierId} style={{ marginBottom: "10px" }}>
                <Link
                  href={`/${conceptId}/${classifierId}`}
                  style={{
                    display: "inline-block",
                    padding: "10px 15px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "5px",
                    textDecoration: "none",
                    color: "#333",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#e0e0e0";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f0f0";
                  }}
                >
                  {classifierId}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !error && classifiers.length === 0 && (
        <div style={{ color: "#666" }}>
          <p>No classifiers found for concept {conceptId}</p>
        </div>
      )}
    </div>
  );
}
