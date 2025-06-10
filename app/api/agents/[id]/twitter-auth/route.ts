import { NextResponse } from 'next/server';
import { requireAuth } from '../../../utils/auth';
import { twitterAuthSchema } from '../../../schemas/validation';
import prisma from '@/app/db/utils/dbClient';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  
  try {
    // 1. Authenticate user
    const userId = await requireAuth(request);
    
    // 2. Validate request body
    const body = await request.json();
    const validation = twitterAuthSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { cookies } = validation.data;
    
    console.log(`[Twitter-Auth Route] Processing cookies for agent ${agentId}, user ${userId}`);
    
    // 3. Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      select: { agentId: true, userId: true, name: true }
    });
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'Agent does not belong to user' },
        { status: 403 }
      );
    }
    
    // 4. Delete existing cookies for this user (cleanup old cookies)
    await prisma.cookie.deleteMany({
      where: { userId }
    });
    
    // 5. Save new cookies to database
    const cookiesToSave = [
      {
        userId,
        key: 'auth_token',
        value: cookies.auth_token,
        domain: '.twitter.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expires: null // No expiration for manually entered cookies
      },
      {
        userId,
        key: 'ct0',
        value: cookies.ct0,
        domain: '.twitter.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expires: null
      },
      {
        userId,
        key: 'twid',
        value: cookies.twid,
        domain: '.twitter.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expires: null
      }
    ];
    
    await prisma.cookie.createMany({
      data: cookiesToSave
    });
    
    // console.log(`[Twitter-Auth Route] Successfully saved cookies for agent ${agentId}`);
    
    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'Twitter cookies saved successfully',
      agentId
    });
    
  } catch (error) {
    console.error(`[Twitter-Auth Route] Error:`, error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to process Twitter auth request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 