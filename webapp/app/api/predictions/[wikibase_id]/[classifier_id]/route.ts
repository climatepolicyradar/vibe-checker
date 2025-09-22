import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";

export async function GET(
  request: Request,
  { params }: { params: { wikibase_id: string; classifier_id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "100");

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid pagination parameters. Page must be >= 1, pageSize must be between 1 and 100",
        },
        { status: 400 }
      );
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromIni({
        profile: process.env.AWS_PROFILE,
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

    // Parse JSONL data for pagination
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const totalLines = lines.length;
    const totalPages = Math.ceil(totalLines / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLines = lines.slice(startIndex, endIndex);
    const paginatedPassages = paginatedLines.map((line) => {
      return JSON.parse(line);
    });

    return NextResponse.json({
      success: true,
      data: paginatedPassages,
      s3Uri: `s3://${bucket}/${key}`,
      pagination: {
        page,
        pageSize,
        totalLines,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
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
