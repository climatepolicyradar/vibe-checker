"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [predictions, setPredictions] = useState<string>("");
  const [s3Uri, setS3Uri] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Q572/f4wd8v89
  // Q53/urc4yfb5
  const wikibaseId = "Q572";
  const classifierId = "f4wd8v89";

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch(
          `/api/predictions/${wikibaseId}/${classifierId}`
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

    fetchPredictions();
  }, []);

  return (
    <html>
      <body>
        <div style={{ padding: "20px", fontFamily: "monospace" }}>
          <h1>Vibe Checker Predictions</h1>
          <p>Fetching predictions from: {s3Uri || "Loading..."}</p>
          {(wikibaseId || classifierId) && (
            <p>
              <strong>Concept:</strong> {wikibaseId} |{" "}
              <strong>Classifier:</strong> {classifierId}
            </p>
          )}

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
      </body>
    </html>
  );
}
