import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";

export async function GET(
  request: Request,
  { params }: { params: { wikibase_id: string; classifier_id: string } }
) {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromIni({
        profile: process.env.AWS_PROFILE,
        region: process.env.AWS_REGION,
      }),
    });

    const bucket = process.env.BUCKET_NAME;
    const { wikibase_id, classifier_id } = params;
    const key = `${wikibase_id}/${classifier_id}/predictions.jsonl`;
    console.log("Key:", key);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);
    const body = response.Body;

    if (!body) {
      throw new Error("No body in S3 response");
    }

    const text = await body.transformToString();

    return NextResponse.json({
      success: true,
      data: text,
      s3Uri: `s3://${bucket}/${key}`,
    });
  } catch (error) {
    console.error("Error fetching predictions from S3:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
