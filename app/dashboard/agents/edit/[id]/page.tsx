import { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { AgentUpdateForm } from "@/components/dashboard/agents/edit-form";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Edit Agent - Dashboard",
  description: "Edit your social media agent",
};

interface EditAgentPageProps {
  params: { id: string }
}

const prisma = new PrismaClient();

async function getAgent(id: string) {
  try {
    // Get the current user session
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      redirect("/login?callbackUrl=/dashboard/agents");
    }
    
    // Fetch the agent by ID, ensuring it belongs to the current user
    const agent = await prisma.agent.findUnique({
      where: {
        agentId: id,
        userId: session.user.id,
      }
    });
    
    if (!agent) {
      return null;
    }
    
    return {
      agentId: agent.agentId,
      name: agent.name,
      goal: agent.goal,
      status: agent.status,
      language: agent.language,
      brand: agent.brand || {
        tone: "professional",
        personality: "friendly",
        interests: []
      },
      specialHooks: agent.specialHooks || {
        hashtagsToTrack: [],
        accountsToMonitor: []
      }
    };
  } catch (error) {
    console.error("Error fetching agent:", error);
    return null;
  }
}

export default async function EditAgentPage({ params }: EditAgentPageProps) {
  const agent = await getAgent(params.id);
  
  if (!agent) {
    notFound();
  }
  
  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-8">
        <DashboardHeader
          heading={`Edit - ${agent.name}`}
          text="Update your social media automation agent"
        />
        <div className="hidden md:flex items-center justify-center h-20 w-20 rounded-full bg-muted">
          <Pencil className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      
      <div className="grid gap-8">        
        <Suspense fallback={<AgentEditSkeleton />}>
          <AgentUpdateForm agent={agent} />
        </Suspense>
      </div>
    </DashboardShell>
  );
}

function AgentEditSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-60" />
        </div>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 