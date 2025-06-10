import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth"; // Make sure this path is correct
import { EXPRESS_SERVER_URL } from '@/app/config/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tweetId: string } }
) {
  try {
    // 1. Authenticate user via Next.js middleware/utils
    const userId = await requireAuth(request);
    const tweetId = params.tweetId;

    if (!tweetId) {
         return NextResponse.json(
             { error: "Tweet ID is missing in the URL path." },
             { status: 400 }
         );
    }

    console.log(`[Next API Scraper Route] Forwarding analytics request for Tweet ${tweetId} (User: ${userId}) to Express Scraper endpoint.`);

    // 2. Forward request to the NEW Express endpoint
    const expressUrl = `${EXPRESS_SERVER_URL}/api/twitter/tweet-analytics-scraper?tweetId=${encodeURIComponent(tweetId)}`;

    const response = await fetch(
      expressUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Pass the authenticated user ID to the Express backend
          'X-User-Id': userId
        },
        credentials: 'omit',
      }
    );

    // 3. Read the response body *ONCE*
    let responseData: any;
    try {
       // Attempt to parse as JSON first, as that's the expected success format
       responseData = await response.json();
    } catch (e) {
        // If JSON parsing fails (e.g., empty body or non-JSON error from Express),
        // try reading as text. This might capture plain text errors.
        // Note: This still consumes the body if the initial .json() attempt failed mid-stream.
        // A more robust way might involve checking Content-Type first, but this covers many cases.
         try {
            // We need to re-fetch or handle differently as .json() consumes body even on failure.
            // For simplicity here, we assume if .json() fails, the useful error might be in text,
            // but a better approach might be needed if Express sends non-JSON errors often.
            // Let's assume Express sends JSON errors or success. If .json() fails, it's likely empty or truly malformed.
            console.warn(`[Next API Scraper Route] Failed to parse response as JSON for Tweet ${tweetId}. Status: ${response.status}. Attempting text fallback might fail if body was partially consumed.`);
            // responseData = await response.text(); // This line might cause the error if .json() failed mid-read. Let's skip it for now.
            responseData = { error: "Received non-JSON response from backend service." }; // Assign generic error

         } catch (textError) {
             // If even .text() fails, something is wrong.
             console.error(`[Next API Scraper Route] Failed to read response body for Tweet ${tweetId}. Status: ${response.status}.`, textError);
             responseData = { error: "Failed to read response body from backend service." };
         }
    }


    // 4. Check if the response was successful *after* reading the body
    if (!response.ok) {
        console.error(`[Next API Scraper Route] Error from Express for Tweet ${tweetId}. Status: ${response.status}`, responseData);
        return NextResponse.json(
            {
              error: "Failed to fetch tweet analytics from backend service (scraper).",
              // Use the parsed responseData which might contain error details from Express
              details: responseData?.error || responseData?.details || responseData
            },
            { status: response.status }
        );
    }

    // 5. Return successful response data (already parsed)
    console.log(`[Next API Scraper Route] Received analytics data for Tweet ${tweetId} from Express (scraper).`);
    return NextResponse.json(responseData, { // Use the already parsed responseData
      status: response.status
    });

  } catch (error: any) {
    console.error(`[Next API Scraper Route] Error processing analytics request for Tweet ${params?.tweetId}:`, error);

     if (error.message === 'Authentication required' || error.status === 401) {
         return NextResponse.json(
             { error: "Authentication required." },
             { status: 401 }
         );
     }

    // Include the specific error message in the response
    return NextResponse.json(
      { error: "Failed to process scraper tweet analytics request.", details: error.message },
      { status: 500 }
    );
  }
} 