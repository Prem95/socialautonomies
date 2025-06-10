import { TwitterApi } from "twitter-api-v2";

export async function createTwitterClient(credentials: {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}) {
  return new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessSecret,
  });
}

export async function verifyCredentials(credentials: {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}) {
  try {
    const client = await createTwitterClient(credentials);
    await client.v2.me();
    return true;
  } catch (error) {
    console.error("X credentials verification failed:", error);
    return false;
  }
}