import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});
const cache = new Map<string, Record<string, string>>();

/**
 * Fetch a JSON secret from Secrets Manager. Cached for the lifetime of the
 * Lambda execution environment so warm invocations skip the network call.
 */
export async function getSecret(arn: string): Promise<Record<string, string>> {
  const cached = cache.get(arn);
  if (cached) return cached;

  const res = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) {
    throw new Error(`Secret ${arn} has no string value`);
  }
  const parsed = JSON.parse(res.SecretString) as Record<string, string>;
  cache.set(arn, parsed);
  return parsed;
}
