"use client";

import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";
import { EditAgentList } from "@/components/dashboard/agents/edit/edit-agent-list";

export default function EditAgentsPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Edit Agents"
        text="Modify your existing X agents"
      />
      <EditAgentList />
    </DashboardShell>
  );
}