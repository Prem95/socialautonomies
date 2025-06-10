import { memo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Plus } from "lucide-react";

interface EmptyStateProps {
  profile: any;
}

const EmptyStateComponent = memo(function EmptyState({ profile }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <Activity className="h-8 w-8 text-gray-400" />
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">No Active Agents</h2>
          <p className="text-gray-500">Deploy an agent to see performance metrics</p>
        </div>

        {/* Action */}
        {profile?.usage?.agents?.available > 0 ? (
          <Button 
            asChild 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/dashboard/agents/new">
              <Plus className="mr-2 h-4 w-4" /> 
              Create Agent
            </Link>
          </Button>
        ) : (
          <Button 
            asChild 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        )}
      </div>
    </div>
  );
});

export { EmptyStateComponent as EmptyState }; 