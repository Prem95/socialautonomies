"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { AgentFormFields } from "./agent-form-fields";
import { agentFormSchema, type AgentFormValues } from "@/lib/validations/agent";

interface AgentFormProps {
  onSubmit: (data: AgentFormValues) => Promise<void>;
  isSubmitting: boolean;
  defaultValues?: Partial<AgentFormValues>;
}

export function AgentForm({ onSubmit, isSubmitting, defaultValues }: AgentFormProps) {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: defaultValues || {
      name: "",
      modelType: "gpt4",
      config: {
        postFrequency: 4,
        engagementRules: {
          autoLike: true,
          autoRetweet: false,
          autoFollow: false,
        },
        contentPreferences: {
          topics: [],
          tone: "professional",
          language: "en",
        },
      },
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <AgentFormFields form={form} />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}