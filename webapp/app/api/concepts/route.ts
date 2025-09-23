import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import { load } from "js-yaml";

// Type definitions
interface YamlConcept {
  id?: string;
  wikibase_id?: string;
  preferred_label?: string;
  description?: string;
}


interface EnhancedConcept {
  wikibase_id: string;
  preferred_label: string;
  description: string;
  n_classifiers: number;
}

export async function GET() {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromIni({
        profile: process.env.AWS_PROFILE,
      }),
    });

    const bucket = process.env.BUCKET_NAME;

    // Fetch concepts.yml
    const conceptsKey = "concepts.yml";
    const conceptsCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: conceptsKey,
    });
    const conceptsResponse = await s3Client.send(conceptsCommand);
    const conceptsBody = conceptsResponse.Body;

    if (!conceptsBody) {
      throw new Error("No body in concepts.yml S3 response");
    }

    const yaml_content = await conceptsBody.transformToString();
    const concepts = load(yaml_content) as (string | YamlConcept)[];

    // List all objects to find concept.json files
    const listCommand = new ListObjectsV2Command({ Bucket: bucket });
    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    // Filter for concept.json files and group by concept_id
    const conceptJsonPaths: { [conceptId: string]: string[] } = {};
    for (const obj of objects) {
      if (obj.Key && obj.Key.endsWith("/concept.json")) {
        // Extract concept_id from path like "Q123/classifier_id/concept.json"
        const parts = obj.Key.split("/");
        if (parts.length >= 3) {
          const conceptId = parts[0];
          if (!conceptJsonPaths[conceptId]) {
            conceptJsonPaths[conceptId] = [];
          }
          conceptJsonPaths[conceptId].push(obj.Key);
        }
      }
    }

    // For each concept, get the latest classifier's concept.json
    const enhancedConcepts: EnhancedConcept[] = [];
    for (const concept of concepts) {
      const conceptId =
        typeof concept === "string"
          ? concept
          : concept.id || concept.wikibase_id;

      if (!conceptId) continue;

      const conceptJsonKeys = conceptJsonPaths[conceptId];

      if (conceptJsonKeys && conceptJsonKeys.length > 0) {
        // Sort keys to get the latest classifier (assuming lexicographic order)
        conceptJsonKeys.sort();
        const latestConceptJsonKey =
          conceptJsonKeys[conceptJsonKeys.length - 1];

        try {
          const conceptJsonCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: latestConceptJsonKey,
          });
          const conceptJsonResponse = await s3Client.send(conceptJsonCommand);
          const conceptJsonBody = conceptJsonResponse.Body;

          if (conceptJsonBody) {
            const conceptJsonContent =
              await conceptJsonBody.transformToString();
            const conceptMetadata = JSON.parse(conceptJsonContent);

            enhancedConcepts.push({
              wikibase_id: conceptId,
              preferred_label: conceptMetadata.preferred_label || (typeof concept === "string" ? concept : concept.preferred_label || conceptId),
              description: conceptMetadata.description || (typeof concept === "string" ? `Concept ${concept}` : concept.description || `Concept ${conceptId}`),
              n_classifiers: conceptJsonKeys.length,
            });
          } else {
            enhancedConcepts.push({
              wikibase_id: conceptId,
              preferred_label: typeof concept === "string" ? concept : concept.preferred_label || conceptId,
              description: typeof concept === "string" ? `Concept ${concept}` : concept.description || `Concept ${conceptId}`,
              n_classifiers: conceptJsonKeys.length,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch concept.json for ${conceptId}:`, error);
          enhancedConcepts.push({
            wikibase_id: conceptId,
            preferred_label: typeof concept === "string" ? concept : concept.preferred_label || conceptId,
            description: typeof concept === "string" ? `Concept ${concept}` : concept.description || `Concept ${conceptId}`,
            n_classifiers: 0,
          });
        }
      } else {
        enhancedConcepts.push({
          wikibase_id: conceptId,
          preferred_label: typeof concept === "string" ? concept : concept.preferred_label || conceptId,
          description: typeof concept === "string" ? `Concept ${concept}` : concept.description || `Concept ${conceptId}`,
          n_classifiers: 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: enhancedConcepts,
    });
  } catch (error) {
    console.error("Error fetching concepts from S3:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
