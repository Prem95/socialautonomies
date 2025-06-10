import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth"; // Make sure this path is correct
import { EXPRESS_SERVER_URL } from '@/app/config/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tweetId: string } }
) {
  try {
    // 1. Authenticate user via Next.js middleware/utils
    // This ensures only logged-in users can access this endpoint.
    const userId = await requireAuth(request);
    const tweetId = params.tweetId; // Get tweetId from the URL path segment

    if (!tweetId) {
         return NextResponse.json(
             { error: "Tweet ID is missing in the URL path." },
             { status: 400 }
         );
    }

    console.log(`[Next API Route] Forwarding analytics request for Tweet ${tweetId} (User: ${userId}) to Express.`);

    // 2. Forward request to the Express endpoint
    // Your existing Express route expects tweetId as a query parameter.
    const expressUrl = `${EXPRESS_SERVER_URL}/api/twitter/tweet-analytics?tweetId=${encodeURIComponent(tweetId)}`;

    const response = await fetch(
      expressUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Pass the authenticated user ID to the Express backend
          // The Express route uses this header via getUserId(req)
          'X-User-Id': userId
        },
        // Avoid forwarding browser cookies unless specifically needed by Express auth
        credentials: 'omit',
      }
    );

    // 3. Handle non-OK responses from Express
    if (!response.ok) {
        let errorData: any;
        try {
            errorData = await response.json(); // Try parsing JSON error response
        } catch {
            errorData = await response.text(); // Fallback to text
        }
        console.error(`[Next API Route] Error from Express for Tweet ${tweetId}. Status: ${response.status}`, errorData);
        return NextResponse.json(
            {
              error: "Failed to fetch tweet analytics from backend service.",
              details: errorData?.error || errorData?.details || errorData // Extract details if possible
            },
            { status: response.status } // Forward the status code
        );
    }

    // 4. Return successful Express response to the client
    const responseData = await response.json();
    console.log(`[Next API Route] Received analytics data for Tweet ${tweetId} from Express.`);
    return NextResponse.json(responseData, {
      status: response.status
    });

  } catch (error: any) {
    console.error(`[Next API Route] Error processing analytics request for Tweet ${params?.tweetId}:`, error);

     // Handle specific auth errors from requireAuth
     if (error.message === 'Authentication required' || error.status === 401) {
         return NextResponse.json(
             { error: "Authentication required." },
             { status: 401 }
         );
     }

    // Generic server error
    return NextResponse.json(
      { error: "Failed to process tweet analytics request.", details: error.message },
      { status: 500 }
    );
  }
} 