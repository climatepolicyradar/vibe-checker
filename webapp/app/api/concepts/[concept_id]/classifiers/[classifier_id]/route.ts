import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { fromIni } from "@aws-sdk/credential-providers";
import cache from "@/lib/cache";

interface ClassifierData {
  id: string;
  string: string;
  name: string;
  date: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ concept_id: string; classifier_id: string }> },
) {
  try {
    const { concept_id, classifier_id } = await params;

    // Check cache first
    const cacheKey = `classifier-${concept_id}-${classifier_id}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for classifier: ${concept_id}/${classifier_id}`);
      return NextResponse.json(cachedData);
    }

    console.log(`Cache miss for classifier: ${concept_id}/${classifier_id}, fetching from S3...`);
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromIni({
        profile: process.env.AWS_PROFILE,
      }),
    });

    const bucket = process.env.BUCKET_NAME;
    const key = `${concept_id}/${classifier_id}/classifier.json`;

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);
    const body = response.Body;

    if (!body) {
      throw new Error("No body in S3 response");
    }

    const text = await body.transformToString();
    const classifierData: ClassifierData = JSON.parse(text);

    const result = {
      success: true,
      data: classifierData,
    };

    // Store in cache
    cache.set(cacheKey, result);
    console.log(`Classifier data cached successfully for: ${concept_id}/${classifier_id}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching classifier:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}