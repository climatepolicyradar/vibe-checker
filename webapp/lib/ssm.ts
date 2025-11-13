import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { fromContainerMetadata, fromIni } from "@aws-sdk/credential-providers";

const isECS = !!process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;

export async function getSSMParameter(parameterName: string): Promise<string> {
  const client = new SSMClient({
    region: process.env.AWS_REGION || "eu-west-1",
    credentials: isECS
      ? fromContainerMetadata()
      : fromIni({ profile: process.env.AWS_PROFILE || "labs" }),
  });

  try {
    const response = await client.send(
      new GetParameterCommand({ Name: parameterName, WithDecryption: false }),
    );
    return (
      response.Parameter?.Value ||
      (() => {
        throw new Error(`Parameter ${parameterName} has no value`);
      })()
    );
  } catch (error) {
    throw new Error(
      `Failed to retrieve ${parameterName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
