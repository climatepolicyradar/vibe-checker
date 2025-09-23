import {
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ concept_id: string }> },
) {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromIni({
        profile: process.env.AWS_PROFILE,
      }),
    });

    const bucket = process.env.BUCKET_NAME;
    const { concept_id } = await params;

    // List all objects under the concept_id prefix
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `${concept_id}/`,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    // Extract classifier IDs from the common prefixes
    const classifiers =
      response.CommonPrefixes?.map((prefix) => {
        // Remove the concept_id/ prefix and trailing slash
        return prefix.Prefix?.replace(`${concept_id}/`, "").replace("/", "");
      }).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      data: classifiers,
    });
  } catch (error) {
    console.error("Error fetching classifiers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
