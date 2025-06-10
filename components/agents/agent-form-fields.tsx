"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AgentFormValues } from "@/lib/validations/agent";

interface AgentFormFieldsProps {
  form: UseFormReturn<AgentFormValues>;
}

export function AgentFormFields({ form }: AgentFormFieldsProps) {
  return (
    <div className="grid gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Agent Name</FormLabel>
            <FormControl>
              <Input placeholder="My X Agent" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="modelType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>AI Model</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="gpt4">GPT-4</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="config.postFrequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Post Frequency (hours)</FormLabel>
            <FormControl>
              <Input type="number" min={1} max={24} {...field} />
            </FormControl>
            <FormDescription>
              How often should the agent post (in hours)
            </FormDescription>
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Engagement Rules</h3>
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="config.engagementRules.autoLike"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Auto Like</FormLabel>
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="config.engagementRules.autoRetweet"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Auto Retweet</FormLabel>
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="config.engagementRules.autoFollow"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Auto Follow</FormLabel>
                <FormControl>
                  <Switch
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}