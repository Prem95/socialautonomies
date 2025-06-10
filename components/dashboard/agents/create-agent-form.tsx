"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentFormSchema, type AgentFormValues } from "@/lib/validations/agent";

interface CreateAgentFormProps {
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
}

const personalityTypes = [
  { value: "professional", label: "Professional & Formal" },
  { value: "friendly", label: "Friendly & Casual" },
  { value: "witty", label: "Witty & Humorous" },
  { value: "empathetic", label: "Empathetic & Supportive" },
  { value: "technical", label: "Technical & Precise" },
  { value: "creative", label: "Creative & Imaginative" },
];

export function CreateAgentForm({ isSubmitting, setIsSubmitting, onSuccess }: CreateAgentFormProps) {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      purpose: "",
      keywords: "",
      exampleReply: "",
      personalityType: "professional",
    },
  });

  async function onSubmit(data: AgentFormValues) {
    try {
      setIsSubmitting(true);
      // Here you would typically make an API call to create the agent
      console.log("Creating agent:", data);
      onSuccess();
    } catch (error) {
      console.error("Error creating agent:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Agent Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Tech Support Assistant" {...field} />
              </FormControl>
              <FormDescription>
                Choose a unique and descriptive name for your agent
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the primary function and goals of your agent..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Clearly define what your agent will help users with
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords</FormLabel>
              <FormControl>
                <Input 
                  placeholder="tech support, troubleshooting, software help"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add specific terms that will trigger your agent's responses (comma-separated)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exampleReply"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Example Reply</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Provide a sample response that demonstrates your agent's communication style..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This helps train the AI to match your desired tone and style
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personality Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a personality type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {personalityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose how your agent should interact with users
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </form>
    </Form>
  );
}