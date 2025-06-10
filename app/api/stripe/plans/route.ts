import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';

// Helper function to handle BigInt serialization
function serializeData(data: any): any {
  return JSON.parse(
    JSON.stringify(
      data,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value)
    )
  );
}

// Add this to make the route dynamic and not static
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get authenticated user ID from request headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    
    // If no user ID, return unauthorized
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Fetch all plans from the database
    const plans = await prisma.plan.findMany({
      orderBy: {
        price: 'asc'
      }
    });
    
    // Transform the plans data for monthly-only pricing
    const transformedPlans = plans.map((plan: any) => {
      const monthlyPrice = parseFloat(plan.price.toString());
      
      return {
        ...plan,
        price: monthlyPrice, // Simple monthly price
        stripePriceIdMonthly: plan.stripePriceId // Include monthly price ID
      };
    });
    
    // Return serialized plans data
    return NextResponse.json(serializeData(transformedPlans));
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 