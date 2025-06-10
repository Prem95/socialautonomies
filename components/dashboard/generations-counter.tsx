"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ZapIcon } from "lucide-react";

interface GenerationsCounterProps {
  className?: string;
}

export function GenerationsCounter({ className }: GenerationsCounterProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    customGenerationsUsed: number;
    plan: { maxCustomGenerations: number; planName: string };
  } | null>(null);

  useEffect(() => {
    async function fetchGenerationsData() {
      try {
        const response = await fetch('/api/profile');
        
        if (!response.ok) {
          throw new Error('Could not fetch profile data');
        }
        
        const profileData = await response.json();
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching generations data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load generations data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchGenerationsData();
  }, []);
  
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !profile) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground text-sm">
            Could not load generations data
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const used = profile.customGenerationsUsed;
  const total = profile.plan.maxCustomGenerations;
  const remaining = Math.max(0, total - used);
  const percentage = Math.min(100, (used / total) * 100);
  
  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <ZapIcon className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-medium">Custom Generations</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {remaining} of {total} remaining
            </span>
            <span className="font-medium">
              {profile.plan.planName} plan
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        
        {used >= total && (
          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
            You've reached your generation limit. Consider upgrading your plan for more.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 