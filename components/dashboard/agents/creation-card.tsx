"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthRefresh } from "@/hooks/use-auth-refresh";

export function AgentCreationCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const { refreshSession } = useAuthRefresh();
  
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    language: "en-US",
    brand: {
      tone: "professional",
      personality: "friendly",
      interests: [] as string[]
    },
    specialHooks: {
      hashtagsToTrack: [] as string[],
      accountsToMonitor: [] as string[]
    }
  });
  
  const [interests, setInterests] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [accounts, setAccounts] = useState("");

  useEffect(() => {
    async function checkUserProfile() {
      try {
        setIsCheckingProfile(true);
        
        // Refresh auth session first
        const success = await refreshSession();
        if (!success) {
          setHasProfile(false);
          return;
        }
        
        // Make sure credentials are included to send cookies with the request
        const response = await axios.get("/api/profile", { 
          withCredentials: true 
        });
        const data = response.data;
        
        setProfileData(data);
        setHasProfile(data && data.planId);
      } catch (error) {
        console.error("Error checking profile:", error);
        
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          console.log("Authentication required. Redirecting to login...");
          toast({
            title: "Authentication Required",
            description: "Please sign in to access this page",
            variant: "destructive",
          });
          
          setTimeout(() => {
            router.push("/login?redirect=/dashboard/agents/new");
          }, 1500);
        }
        
        setHasProfile(false);
      } finally {
        setIsCheckingProfile(false);
      }
    }
    
    checkUserProfile();
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleBrandChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      brand: {
        ...formData.brand,
        [name]: value
      }
    });
  };
  
  const updateInterests = () => {
    if (interests.trim()) {
      const interestsArray = interests.split(",").map(item => item.trim());
      setFormData({
        ...formData,
        brand: {
          ...formData.brand,
          interests: interestsArray
        }
      });
      setInterests("");
    }
  };
  
  const updateHashtags = () => {
    if (hashtags.trim()) {
      const hashtagsArray = hashtags.split(",").map(item => item.trim());
      setFormData({
        ...formData,
        specialHooks: {
          ...formData.specialHooks,
          hashtagsToTrack: hashtagsArray
        }
      });
      setHashtags("");
    }
  };
  
  const updateAccounts = () => {
    if (accounts.trim()) {
      const accountsArray = accounts.split(",").map(item => item.trim());
      setFormData({
        ...formData,
        specialHooks: {
          ...formData.specialHooks,
          accountsToMonitor: accountsArray
        }
      });
      setAccounts("");
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure arrays are updated with the latest values
    updateInterests();
    updateHashtags();
    updateAccounts();
    
    if (!formData.name || !formData.goal) {
      toast({
        title: "Missing fields",
        description: "Please provide a name and goal for your agent.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post("/api/agents", formData);
      console.log('This is the response', response);
      
      toast({
        title: "Agent created",
        description: "Your new agent has been created successfully.",
      });
      
      // Redirect to the agents page
      router.push("/dashboard/agents");
      router.refresh();
    } catch (error) {
      console.error("Error creating agent:", error);
      
      // Handle specific error cases
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.error || "An unknown error occurred";
        
        if (status === 400 && errorMessage.includes("active plan")) {
          // No active plan error
          toast({
            title: "No Active Plan",
            description: "You need an active subscription to create agents.",
            variant: "destructive",
          });
          
          // Redirect to the pricing page
          router.push("/pricing");
          return;
        } else if (status === 404 && errorMessage.includes("Profile not found")) {
          // Profile not found error
          toast({
            title: "Profile Not Found",
            description: "Please set up your profile before creating agents.",
            variant: "destructive",
          });
          
          // Redirect to the pricing page
          router.push("/pricing");
          return;
        } else if (status === 400 && errorMessage.includes("Agent limit reached")) {
          // Agent limit reached error
          toast({
            title: "Agent Limit Reached",
            description: errorMessage,
            variant: "destructive",
          });
          
          // Redirect to the pricing page to upgrade
          router.push("/pricing");
          return;
        }
        
        // Default error message
        toast({
          title: "Failed to create agent",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Generic error handling
        toast({
          title: "Failed to create agent",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingProfile) {
    return (
      <div className="motion-reduce:transform-none motion-reduce:transition-none">
        <Card className="w-full max-w-4xl mx-auto flex items-center justify-center p-6 sm:p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary motion-reduce:animate-none" />
            <p className="text-sm text-muted-foreground text-center">Checking subscription status...</p>
          </div>
        </Card>
      </div>
    );
  }
  
  if (hasProfile === false) {
    return (
      <div className="motion-reduce:transform-none motion-reduce:transition-none">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Subscription Required</CardTitle>
            <CardDescription className="text-sm">You need an active subscription to create agents</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Active Plan</AlertTitle>
              <AlertDescription>
                There is no active plan for your account. Subscribe to a plan to start creating agents.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="px-4 sm:px-6">
            <Button 
              onClick={() => router.push("/pricing")}
              className="w-full h-10"
            >
              View Pricing Plans
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="motion-reduce:transform-none motion-reduce:transition-none">
      <Card className="w-full max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Agent Information</CardTitle>
          {profileData?.usage && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardDescription className="text-sm">
                  Your Plan: <span className="font-medium">{profileData.plan?.planName || "Unknown"}</span>
                </CardDescription>
                <CardDescription className="text-sm">
                  Agents: <span className="font-medium">{profileData.usage.agents.current}</span> of <span className="font-medium">{profileData.usage.agents.max}</span>
                </CardDescription>
              </div>
              
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-none"
                  style={{ width: `${profileData.usage.agents.percentage}%` }}
                />
              </div>
              
              {profileData.usage.agents.available <= 0 ? (
                <div className="text-xs text-destructive">
                  You've reached your agent limit. Upgrade your plan for more agents.
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  You can create <span className="font-medium">{profileData.usage.agents.available}</span> more agent{profileData.usage.agents.available !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-4 sm:px-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Agent Name</Label>
                <Input 
                  id="name" 
                  name="name"
                  placeholder="Tech News Bot"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading} 
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => handleSelectChange("language", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-10">
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
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-sm font-medium">Agent Goal</Label>
              <Textarea 
                id="goal" 
                name="goal"
                placeholder="Share the latest tech news and engage with followers on AI topics"
                value={formData.goal}
                onChange={handleChange}
                disabled={isLoading}
                required
                className="min-h-[80px] sm:min-h-[100px] resize-none"
              />
            </div>
          </div>
          
          {/* Brand Information */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Brand Profile</h3>
            
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-sm font-medium">Tone</Label>
                <Select
                  value={formData.brand.tone}
                  onValueChange={(value) => handleBrandChange("tone", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-10">
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="personality" className="text-sm font-medium">Personality</Label>
                <Select
                  value={formData.brand.personality}
                  onValueChange={(value) => handleBrandChange("personality", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-10">
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
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interests" className="text-sm font-medium">Interests (comma separated)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  id="interests" 
                  placeholder="AI, machine learning, technology"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  disabled={isLoading}
                  className="h-10 flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={updateInterests}
                  disabled={isLoading}
                  className="h-10 px-4 whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              {formData.brand.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.brand.interests.map((interest, index) => (
                    <div 
                      key={index} 
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Special Hooks */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium">Special Hooks</h3>
            
            <div className="space-y-2">
              <Label htmlFor="hashtags" className="text-sm font-medium">Hashtags to Track (comma separated)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  id="hashtags" 
                  placeholder="#ai, #machinelearning"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  disabled={isLoading}
                  className="h-10 flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={updateHashtags}
                  disabled={isLoading}
                  className="h-10 px-4 whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              {formData.specialHooks.hashtagsToTrack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialHooks.hashtagsToTrack.map((hashtag, index) => (
                    <div 
                      key={index} 
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {hashtag}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accounts" className="text-sm font-medium">Accounts to Monitor (comma separated)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  id="accounts" 
                  placeholder="@openai, @elonmusk"
                  value={accounts}
                  onChange={(e) => setAccounts(e.target.value)}
                  disabled={isLoading}
                  className="h-10 flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={updateAccounts}
                  disabled={isLoading}
                  className="h-10 px-4 whitespace-nowrap"
                >
                  Add
                </Button>
              </div>
              {formData.specialHooks.accountsToMonitor.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialHooks.accountsToMonitor.map((account, index) => (
                    <div 
                      key={index} 
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {account}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push("/dashboard/agents")}
            disabled={isLoading}
            className="w-full sm:w-auto h-10"
          >
            Cancel
          </Button>
          {profileData?.usage?.agents?.available <= 0 ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/pricing")}
              className="w-full sm:w-auto h-10"
            >
              Upgrade Plan
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isLoading || profileData?.usage?.agents?.available <= 0}
              className="w-full sm:w-auto h-10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create Agent"
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
    </div>
  );
}