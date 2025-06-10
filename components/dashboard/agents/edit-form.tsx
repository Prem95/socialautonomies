"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Form schema for agent updates
const updateAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(40, "Name cannot exceed 40 characters"),
  goal: z.string().min(1, "Agent goal is required").max(500, "Goal cannot exceed 500 characters"),
  language: z.string().min(1, "Language is required"),
  brand: z.object({
    tone: z.string(),
    personality: z.string(),
    interests: z.array(z.string()),
  }),
  specialHooks: z.object({
    hashtagsToTrack: z.array(z.string()),
    accountsToMonitor: z.array(z.string()),
  }),
});

type UpdateAgentFormValues = z.infer<typeof updateAgentSchema>;

interface Agent {
  agentId: string;
  name: string;
  goal: string;
  language: string;
  status: string;
  brand?: {
    tone: string;
    personality: string;
    interests: string[];
  };
  specialHooks?: {
    hashtagsToTrack: string[];
    accountsToMonitor: string[];
  };
}

interface AgentUpdateFormProps {
  agent: Agent;
}

export function AgentUpdateForm({ agent }: AgentUpdateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // State for managing temporary input values
  const [interests, setInterests] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [accounts, setAccounts] = useState("");

  // Initialize form with existing agent data
  const form = useForm<UpdateAgentFormValues>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: agent.name,
      goal: agent.goal,
      language: agent.language || "en-US",
      brand: {
        tone: agent.brand?.tone || "professional",
        personality: agent.brand?.personality || "friendly",
        interests: agent.brand?.interests || [],
      },
      specialHooks: {
        hashtagsToTrack: agent.specialHooks?.hashtagsToTrack || [],
        accountsToMonitor: agent.specialHooks?.accountsToMonitor || [],
      },
    },
  });

  const watchedBrand = form.watch("brand");
  const watchedSpecialHooks = form.watch("specialHooks");

  const addInterests = () => {
    if (interests.trim()) {
      const interestsArray = interests.split(",").map(item => item.trim());
      const currentInterests = form.getValues("brand.interests");
      const newInterests = [...currentInterests, ...interestsArray];
      form.setValue("brand.interests", newInterests);
      setInterests("");
    }
  };

  const removeInterest = (index: number) => {
    const currentInterests = form.getValues("brand.interests");
    const newInterests = currentInterests.filter((_, i) => i !== index);
    form.setValue("brand.interests", newInterests);
  };

  const addHashtags = () => {
    if (hashtags.trim()) {
      const hashtagsArray = hashtags.split(",").map(item => item.trim());
      const currentHashtags = form.getValues("specialHooks.hashtagsToTrack");
      const newHashtags = [...currentHashtags, ...hashtagsArray];
      form.setValue("specialHooks.hashtagsToTrack", newHashtags);
      setHashtags("");
    }
  };

  const removeHashtag = (index: number) => {
    const currentHashtags = form.getValues("specialHooks.hashtagsToTrack");
    const newHashtags = currentHashtags.filter((_, i) => i !== index);
    form.setValue("specialHooks.hashtagsToTrack", newHashtags);
  };

  const addAccounts = () => {
    if (accounts.trim()) {
      const accountsArray = accounts.split(",").map(item => item.trim());
      const currentAccounts = form.getValues("specialHooks.accountsToMonitor");
      const newAccounts = [...currentAccounts, ...accountsArray];
      form.setValue("specialHooks.accountsToMonitor", newAccounts);
      setAccounts("");
    }
  };

  const removeAccount = (index: number) => {
    const currentAccounts = form.getValues("specialHooks.accountsToMonitor");
    const newAccounts = currentAccounts.filter((_, i) => i !== index);
    form.setValue("specialHooks.accountsToMonitor", newAccounts);
  };

  async function onSubmit(values: UpdateAgentFormValues) {
    setIsLoading(true);

    try {
      // Update agent via API
      const response = await axios.put(`/api/agents/${agent.agentId}`, values);

      toast({
        title: "Agent Updated",
        description: "Your agent has been successfully updated",
      });

      // Redirect back to agents list
      router.push('/dashboard/agents');
      router.refresh();
    } catch (error) {
      console.error("Error updating agent:", error);
      
      let errorMessage = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to Update Agent",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Information</CardTitle>
            <CardDescription>
              Update your social media automation agent details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tech News Bot" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="en-GB">English (UK)</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Goal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share the latest tech news and engage with followers on AI topics"
                        className="min-h-[100px] resize-none"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what this agent should do in detail. This will guide its behavior.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Brand Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Brand Profile</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brand.tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                            <SelectItem value="informative">Informative</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="brand.personality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personality</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select personality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friendly">Friendly</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="helpful">Helpful</SelectItem>
                            <SelectItem value="witty">Witty</SelectItem>
                            <SelectItem value="serious">Serious</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interests">Interests (comma separated)</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="interests" 
                    placeholder="AI, machine learning, technology"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addInterests}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                </div>
                {watchedBrand.interests && watchedBrand.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchedBrand.interests.map((interest, index) => (
                      <div 
                        key={index} 
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(index)}
                          className="text-primary hover:text-primary/70"
                          disabled={isLoading}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Special Hooks */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Special Hooks</h3>
              
              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags to Track (comma separated)</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="hashtags" 
                    placeholder="#ai, #machinelearning"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addHashtags}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                </div>
                {watchedSpecialHooks.hashtagsToTrack && watchedSpecialHooks.hashtagsToTrack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchedSpecialHooks.hashtagsToTrack.map((hashtag, index) => (
                      <div 
                        key={index} 
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {hashtag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(index)}
                          className="text-primary hover:text-primary/70"
                          disabled={isLoading}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accounts">Accounts to Monitor (comma separated)</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="accounts" 
                    placeholder="@openai, @elonmusk"
                    value={accounts}
                    onChange={(e) => setAccounts(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addAccounts}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                </div>
                {watchedSpecialHooks.accountsToMonitor && watchedSpecialHooks.accountsToMonitor.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {watchedSpecialHooks.accountsToMonitor.map((account, index) => (
                      <div 
                        key={index} 
                        className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {account}
                        <button
                          type="button"
                          onClick={() => removeAccount(index)}
                          className="text-primary hover:text-primary/70"
                          disabled={isLoading}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/agents')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Agent"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
} 