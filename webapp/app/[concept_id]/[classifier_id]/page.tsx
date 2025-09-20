"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function PredictionsPage() {
  const params = useParams();
  const conceptId = params.concept_id as string;
  const classifierId = params.classifier_id as string;

  const [predictions, setPredictions] = useState<string>("");
  const [s3Uri, setS3Uri] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch(
          `/api/predictions/${conceptId}/${classifierId}`
        );
        const result = await response.json();

        if (result.success) {
          setPredictions(result.data);
          setS3Uri(result.s3Uri);
        } else {
          throw new Error(result.error || "Failed to fetch predictions");
        }
      } catch (err) {
        console.error("Error fetching predictions:", err);
        setError(
          `Failed to fetch predictions: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    if (conceptId && classifierId) {
      fetchPredictions();
    }
  }, [conceptId, classifierId]);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link
          href={`/${conceptId}`}
          style={{
            color: "#666",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          ← Back to {conceptId} classifiers
        </Link>
      </div>

      <h1>Predictions</h1>
      <p>
        <strong>Concept:</strong> {conceptId} | <strong>Classifier:</strong>{" "}
        {classifierId}
      </p>
      <p>Fetching predictions from: {s3Uri || "Loading..."}</p>

      {loading && <p>Loading predictions...</p>}

      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && predictions && (
        <div>
          <h2>Predictions Data:</h2>
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              overflow: "auto",
              maxHeight: "80vh",
              whiteSpace: "pre-wrap",
              fontSize: "12px",
            }}
          >
            {predictions}
          </pre>
        </div>
      )}
    </div>
  );
}
