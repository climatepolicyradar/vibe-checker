import { NextResponse } from "next/server";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status },
  );
}

export function errorResponse(error: unknown, status = 500) {
  let message = "Unknown error";
  let httpStatus = status;

  if (error instanceof Error) {
    message = error.message;

    // Handle AWS credential errors with more helpful messages
    if (
      error.name === "CredentialsProviderError" ||
      error.message.includes("Token is expired")
    ) {
      message =
        "AWS credentials have expired. Please run 'aws sso login' to refresh your session.";
      httpStatus = 503; // Service Unavailable - indicates a configuration issue
    } else if (
      error.message.includes("BUCKET_NAME environment variable is not set")
    ) {
      message = "Server configuration error: S3 bucket name is not configured.";
      httpStatus = 500;
    } else if (error.message.includes("No body in S3 response")) {
      message = "Failed to retrieve data from storage.";
      httpStatus = 502; // Bad Gateway - upstream service issue
    }
  }

  console.error("API Error:", error);
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: httpStatus },
  );
}
