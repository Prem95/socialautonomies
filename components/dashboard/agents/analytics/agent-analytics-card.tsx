"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngagementMetrics } from "./engagement-metrics";
import { ContentAnalysis } from "./content-analysis";
import { PostingTimes } from "./posting-times";

export function AgentAnalyticsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="engagement">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="engagement">
            <EngagementMetrics />
          </TabsContent>
          
          <TabsContent value="content">
            <ContentAnalysis />
          </TabsContent>
          
          <TabsContent value="timing">
            <PostingTimes />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}