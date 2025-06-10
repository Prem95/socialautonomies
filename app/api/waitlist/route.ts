import { NextRequest, NextResponse } from "next/server";
import prisma from '@/app/db/utils/dbClient';
import { withSecurity, handleError } from '../middleware/security';
import { waitlistSchema } from '../schemas/validation';

export const POST = withSecurity(waitlistSchema, true)(async (
  request: NextRequest,
  context,
  user, // This will be undefined since skipAuth=true
  validatedData
) => {
  try {
    if (!validatedData) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const sanitizedEmail = validatedData.email.trim().toLowerCase();

    // Check if email already exists
    const existingEmail = await prisma.waitlist.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: "You're already on our waitlist!" },
        { status: 200 }
      );
    }

    // Add email to waitlist
    await prisma.waitlist.create({
      data: {
        email: sanitizedEmail,
      },
    });

    return NextResponse.json(
      { message: "Successfully joined the waitlist! We'll notify you when we launch." },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, 'Waitlist POST');
  }
}); 