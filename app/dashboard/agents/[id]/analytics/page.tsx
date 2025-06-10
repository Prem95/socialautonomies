//"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { AgentAnalyticsCard } from "@/components/dashboard/agents/analytics/agent-analytics-card";

export default function AgentAnalyticsPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Agent Analytics"
        text="Detailed performance metrics and insights"
      />
      <div className="space-y-8">
        <AgentAnalyticsCard />
      </div>
    </DashboardShell>
  );
}