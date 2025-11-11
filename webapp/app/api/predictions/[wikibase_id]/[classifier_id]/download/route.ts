import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { createS3Client, BUCKET_NAME } from "@/lib/s3";
import { errorResponse } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wikibase_id: string; classifier_id: string }> },
) {
  try {
    const { wikibase_id, classifier_id } = await params;
    const key = `${wikibase_id}/${classifier_id}/predictions.jsonl`;

    const s3Client = createS3Client();
    const bucket = BUCKET_NAME;

    if (!bucket) {
      throw new Error("BUCKET_NAME environment variable is not set");
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);
    const body = response.Body;

    if (!body) {
      throw new Error("No body in S3 response");
    }

    const text = await body.transformToString();

    // Return the raw JSONL file with proper download headers
    return new NextResponse(text, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${wikibase_id}-${classifier_id}-predictions.jsonl"`,
      },
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

