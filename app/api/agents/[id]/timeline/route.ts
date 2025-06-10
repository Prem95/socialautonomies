import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/app/api/utils/auth"; // Make sure this path is correct
import { EXPRESS_SERVER_URL } from "@/app/config/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireAuth(request);
    const agentId = params.id;

    if (!agentId) {
         return NextResponse.json(
             { error: "Agent ID is missing in the URL path." },
             { status: 400 }
         );
    }

    console.log(`[Next API Timeline Route] Forwarding timeline request for Agent ${agentId} (User: ${userId}) to Express Timeline endpoint.`);

    const url = new URL(request.url);
    const count = url.searchParams.get('count') || '20';
    const seenTweetIds = url.searchParams.get('seenTweetIds') || '';

    const queryParams = new URLSearchParams({
      count,
      ...(seenTweetIds && { seenTweetIds })
    });
    
    const expressUrl = `${EXPRESS_SERVER_URL}/api/twitter/home-timeline?${queryParams.toString()}`;

    const response = await fetch(
      expressUrl,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        credentials: 'omit',
      }
    );

    let responseData: any;
    try {
       responseData = await response.json();
    } catch (e) {

         try {
            console.warn(`[Next API Timeline Route] Failed to parse response as JSON for Agent ${agentId}. Status: ${response.status}. Attempting text fallback might fail if body was partially consumed.`);
            responseData = { error: "Received non-JSON response from backend service." }; // Assign generic error

         } catch (textError) {
             console.error(`[Next API Timeline Route] Failed to read response body for Agent ${agentId}. Status: ${response.status}.`, textError);
             responseData = { error: "Failed to read response body from backend service." };
         }
    }

    if (!response.ok) {
        console.error(`[Next API Timeline Route] Error from Express for Agent ${agentId}. Status: ${response.status}`, responseData);
        return NextResponse.json(
            {
              error: "Failed to fetch timeline from backend service. Please try again later.",
              details: responseData?.error || responseData?.details || responseData
            },
            { status: response.status }
        );
    }

    console.log(`[Next API Timeline Route] Received timeline data for Agent ${agentId} from Express.`);
    return NextResponse.json(responseData, { // Use the already parsed responseData
      status: response.status
    });

  } catch (error: any) {
    console.error(`[Next API Timeline Route] Error processing timeline request for Agent ${params?.id}:`, error);

     if (error.message === 'Authentication required' || error.status === 401) {
         return NextResponse.json(
             { error: "Authentication required." },
             { status: 401 }
         );
     }

    // Include the specific error message in the response
    return NextResponse.json(
      { error: "Failed to process timeline request.", details: error.message },
      { status: 500 }
    );
  }
}
