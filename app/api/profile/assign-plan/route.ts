import { NextResponse } from 'next/server';
import prisma from '@/app/db/utils/dbClient';
import { createServerSupabaseClient } from '@/lib/supabase';

// Helper function to handle BigInt serialization
function serializeData(data: any): any {
  return JSON.parse(
    JSON.stringify(
      data,
      (key, value) => (typeof value === 'bigint' ? value.toString() : value)
    )
  );
}

export async function POST(request: Request) {
  try {
    // Validate authentication using the secure getUser() method
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { plan: true }
    });
    
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // If profile already has a plan, return it
    if (existingProfile.planId) {
      return NextResponse.json({
        message: 'Profile already has a plan',
        profile: serializeData(existingProfile)
      });
    }
    
    // Find the Basic plan (assuming planId 1 is the Basic plan)
    // You might want to query for the plan with the lowest price instead
    const basicPlan = await prisma.plan.findFirst({
      where: {
        OR: [
          { planId: BigInt(1) },
          { planName: 'Basic' }
        ]
      }
    });
    
    if (!basicPlan) {
      return NextResponse.json(
        { error: 'Basic plan not found' },
        { status: 500 }
      );
    }
    
    // Update the profile with the Basic plan
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        planId: basicPlan.planId
      },
      include: { plan: true }
    });
    
    return NextResponse.json({
      message: 'Successfully assigned Basic plan to profile',
      profile: serializeData(updatedProfile)
    });
    
  } catch (error) {
    console.error('Error assigning plan to profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 