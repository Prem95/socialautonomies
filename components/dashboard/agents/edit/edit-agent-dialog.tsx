"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditAgentForm } from "./edit-agent-form";

interface EditAgentDialogProps {
  agent: {
    id: string;
    name: string;
    personality: string;
    model: string;
    status: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAgentDialog({ agent, open, onOpenChange }: EditAgentDialogProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit {agent.name}</DialogTitle>
        </DialogHeader>
        <EditAgentForm agent={agent} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}