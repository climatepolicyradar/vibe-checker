import { S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";

export function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: fromIni({
      profile: process.env.AWS_PROFILE,
    }),
  });
}

export const BUCKET_NAME = process.env.BUCKET_NAME;

