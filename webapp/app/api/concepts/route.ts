import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import { load } from "js-yaml";

export async function GET() {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromIni({
        profile: process.env.AWS_PROFILE,
      }),
    });

    const bucket = process.env.BUCKET_NAME;
    const key = "concepts.yml";

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);
    const body = response.Body;

    if (!body) {
      throw new Error("No body in S3 response");
    }

    const yaml_content = await body.transformToString();
    const concepts = load(yaml_content);

    return NextResponse.json({
      success: true,
      data: concepts,
    });
  } catch (error) {
    console.error("Error fetching concepts from S3:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
