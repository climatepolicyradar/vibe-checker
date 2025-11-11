import { fromContainerMetadata, fromIni } from "@aws-sdk/credential-providers";

import { S3Client } from "@aws-sdk/client-s3";

export function createS3Client() {
  const isECS = !!process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;

  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: isECS
      ? // In ECS, use the container metadata endpoint to get credentials from the task IAM role
        fromContainerMetadata()
      : // In local development, use the default credential chain
        fromIni({ profile: process.env.AWS_PROFILE || "labs" }),
  });
}

export const BUCKET_NAME = process.env.BUCKET_NAME;
