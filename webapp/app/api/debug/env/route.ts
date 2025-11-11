export async function GET() {
  const env = {
    AWS_REGION: process.env.AWS_REGION,
    BUCKET_NAME: process.env.BUCKET_NAME,
    AWS_CONTAINER_CREDENTIALS_RELATIVE_URI:
      process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
    AWS_CONTAINER_CREDENTIALS_FULL_URI:
      process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,
    NODE_ENV: process.env.NODE_ENV,
  };

  return Response.json(env, { status: 200 });
}
