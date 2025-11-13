import { fromContainerMetadata, fromIni } from "@aws-sdk/credential-providers";

import { S3Client } from "@aws-sdk/client-s3";
import { getSSMParameter } from "./ssm";

const isECS = !!process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;

export function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || "eu-west-1",
    credentials: isECS
      ? fromContainerMetadata()
      : fromIni({ profile: process.env.AWS_PROFILE || "labs" }),
  });
}

let cachedBucketName: string | null = null;
let bucketNamePromise: Promise<string> | null = null;

/**
 * Get S3 bucket name from SSM Parameter Store. Caches after first call.
 */
export async function getBucketName(): Promise<string> {
  if (cachedBucketName !== null) return cachedBucketName;
  if (bucketNamePromise !== null) return bucketNamePromise;

  bucketNamePromise = (async () => {
    try {
      const bucket = await getSSMParameter("/vibe-checker/bucket-name");
      return (cachedBucketName = bucket);
    } catch (error) {
      throw new Error(
        `Failed to get bucket name: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      bucketNamePromise = null;
    }
  })();

  return bucketNamePromise;
}
