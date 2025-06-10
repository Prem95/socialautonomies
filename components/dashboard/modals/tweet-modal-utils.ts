"use client";

import axios from "axios";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { DashboardModalState } from "./modal-types";

export const useTweetModalUtils = (
  modalState: DashboardModalState,
  setModalState: (state: DashboardModalState) => void
) => {
  const { toast } = useToast();

  const fetchGenerationsInfo = useCallback(async () => {
    try {
      console.log("Fetching generations info...");
      const response = await axios.get('/api/profile/generations-info');
      console.log("Generations info API response:", response.data);
      
      if (response.data && typeof response.data.used === 'number' && typeof response.data.total === 'number' && typeof response.data.remaining === 'number') {
        const newState: DashboardModalState = {
          ...modalState,
          tweet: {
            ...modalState.tweet,
            generationsInfo: {
              used: response.data.used,
              total: response.data.total,
              remaining: response.data.remaining
            }
          }
        };
        console.log("Updated generations info state:", newState.tweet.generationsInfo);
        setModalState(newState);
      } else {
        console.error('Received invalid generation info data:', response.data);
        const newState: DashboardModalState = {
          ...modalState,
          tweet: {
            ...modalState.tweet,
            generationsInfo: { used: 0, total: 0, remaining: 0 }
          }
        };
        setModalState(newState);
      }
    } catch (error) {
      console.error('Error fetching generations info:', error);
      const newState: DashboardModalState = {
        ...modalState,
        tweet: {
          ...modalState.tweet,
          generationsInfo: { used: 0, total: 0, remaining: 0 }
        }
      };
      setModalState(newState);
    }
  }, [modalState, setModalState]);

  const closeTweetModal = () => {
    const { tweet } = modalState;
    
    // Prevent closing if loading
    if (tweet.isLoading) return;
    
    setModalState({
      ...modalState,
      tweet: {
        ...tweet,
        isOpen: false,
        agentId: null,
        text: '',
        generatedText: '',
        context: '',
        url: '',
        xAccountToTag: '',
        stage: 'idle',
        progress: 0,
        isScheduleEnabled: false,
        scheduleTime: '',
        generationsInfo: undefined
      }
    });
  };

  const handleTweetTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { tweet } = modalState;
    
    // Only prevent changes during active processing stages
    if (tweet.stage === "generating" || tweet.stage === "posting") return;
    
    const { name, value } = e.target;
    
    if (name === "context") {
      setModalState({
        ...modalState,
        tweet: {
          ...tweet,
          context: value
        }
      });
    } else if (name === "tweet") {
      setModalState({
        ...modalState,
        tweet: {
          ...tweet,
          text: value.slice(0, 280) // Limit to 280 chars
        }
      });
    }
  };

  // Handler for URL and X account tag input fields
  const handleTweetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { tweet } = modalState;
    
    // Prevent changes during processing
    if (tweet.stage === "generating" || tweet.stage === "posting") return;
    
    const { name, value } = e.target;
    
    if (name === "url") {
      setModalState({
        ...modalState,
        tweet: {
          ...tweet,
          url: value
        }
      });
    } else if (name === "xAccountToTag") {
      // Remove @ if typed by user, we'll format it for display
      const formattedTag = value.startsWith('@') ? value.substring(1) : value;
      setModalState({
        ...modalState,
        tweet: {
          ...tweet,
          xAccountToTag: formattedTag
        }
      });
    }
  };

  const generateTweet = async () => {
    const { tweet } = modalState;
    
    if (!tweet.agentId || tweet.isLoading) return;
    
    // Update state for generation
    setModalState({
      ...modalState,
      tweet: {
        ...tweet,
        isLoading: true,
        stage: "generating",
        progress: 5
      }
    });
    
    try {
      // Determine if this is a regeneration based on whether there's already a generated text
      const isRegeneration = !!tweet.generatedText;
      
      // Log what we're sending to the API
      console.log("Generating tweet with params:", {
        context: tweet.context || "none",
        url: tweet.url || "none",
        xAccountToTag: tweet.xAccountToTag || "none",
        isRegeneration
      });
      
      const response = await axios.post(
        `/api/agents/${tweet.agentId}/generate-tweet`,
        {
          context: tweet.context || undefined,
          url: tweet.url || undefined,
          xAccountToTag: tweet.xAccountToTag || undefined,
          llmProvider: "openai",
          isRegeneration // Add the flag to the API request
        }
      );
      
      console.log("Tweet generation response:", response.data);
      
      // Extract the generated text from the response, with improved structure handling
      let generatedText;
      const generationsInfo = response.data?.generationsInfo;
      
      if (response.data?.tweet?.text) {
        // Standard format from API
        generatedText = response.data.tweet.text;
      } else if (response.data?.content) {
        // Alternative format - direct content
        generatedText = response.data.content;
      }
      
      if (generatedText && typeof generatedText === 'string') {
        // Update state with generated tweet INCLUDING generations info
        // from the same response in a single update
        const newState: DashboardModalState = {
          ...modalState,
          tweet: {
            ...modalState.tweet,
            generatedText: generatedText,
            text: generatedText,
            progress: 70,
            stage: "idle",
            isLoading: false,
            generationsInfo: generationsInfo || modalState.tweet.generationsInfo
          }
        };
        setModalState(newState);
        
        toast({
          title: "Tweet Generated",
          description: "Review the generated tweet or write your own."
        });
      } else {
        console.error("Invalid or missing tweet text in response:", response.data);
        throw new Error("Received invalid content from generation service.");
      }
    } catch (error) {
      console.error("Error generating tweet:", error);
      
      let errorMessage = "An unknown error occurred during tweet generation.";
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 && error.response?.data?.error === "Custom generation limit reached") {
          errorMessage = "You've reached your custom generation limit. Please upgrade your plan for more.";
        } else {
          errorMessage = error.response?.data?.error || 
                        (error.response?.status === 401 ? 
                         "Authentication failed. Please reload." : 
                         "Server connection error during generation.");
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Update state to show error
      setModalState({
        ...modalState,
        tweet: {
          ...modalState.tweet,
          stage: "error",
          progress: 0,
          isLoading: false
        }
      });
      
      toast({
        title: "Tweet Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const postTweet = async () => {
    const { tweet } = modalState;
    
    if (!tweet.agentId || !tweet.text.trim() || tweet.text.length > 280 || tweet.isLoading) {
      if (tweet.text.length > 280) {
        toast({ 
          title: "Tweet Too Long", 
          description: "Tweets cannot exceed 280 characters.", 
          variant: "destructive"
        });
      } else if (!tweet.text.trim()) {
        toast({ 
          title: "Empty Tweet", 
          description: "Cannot post an empty tweet.", 
          variant: "destructive"
        });
      }
      return;
    }
    
    if (tweet.isScheduleEnabled && !tweet.scheduleTime) {
      toast({ 
        title: "Missing Schedule Time", 
        description: "Please select a date and time to schedule the tweet.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (tweet.isScheduleEnabled && new Date(tweet.scheduleTime) < new Date()) {
      toast({ 
        title: "Invalid Schedule Time", 
        description: "Cannot schedule a tweet for a past date/time.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Update state for posting
    setModalState({
      ...modalState,
      tweet: {
        ...tweet,
        isLoading: true,
        stage: "posting",
        progress: 75
      }
    });
    
    try {
      const isScheduling = tweet.isScheduleEnabled;
      
      // Prepare request body for the API
      const requestBody = isScheduling
        ? {
            scheduledAt: new Date(tweet.scheduleTime).toISOString(),
            tweet: {
              text: tweet.text,
              context: tweet.context || undefined,
              url: tweet.url || undefined,
              xAccountToTag: tweet.xAccountToTag || undefined
            }
          }
        : {
            tweet: {
              text: tweet.text,
              context: tweet.context || undefined,
              url: tweet.url || undefined,
              xAccountToTag: tweet.xAccountToTag || undefined
            }
          };
      
      // Log the request body for debugging
      console.log(`Sending ${isScheduling ? 'schedule' : 'post'} tweet request:`, requestBody);
      
      // API endpoint depends on whether we're scheduling or posting immediately
      const endpoint = isScheduling ? 
        `/api/agents/${tweet.agentId}/schedule-tweet` : 
        `/api/agents/${tweet.agentId}/post-tweet`;
      
      const response = await axios.post(endpoint, requestBody);
      
      // Check for success in the response
      if (response.data?.success) {
        // Update state for success
        setModalState({
          ...modalState,
          tweet: {
            ...tweet,
            progress: 100,
            stage: "complete"
          }
        });
        
        // Show success toast
        toast({
          title: isScheduling ? "Tweet Scheduled" : "Tweet Posted",
          description: isScheduling 
            ? `Your tweet is scheduled for ${new Date(tweet.scheduleTime).toLocaleString()}.`
            : (response.data?.message || "Your tweet was successfully posted to X."),
        });
        
        // Close modal after delay
        setTimeout(() => {
          closeTweetModal();
        }, 1500);
      } else {
        // Handle partial success or unexpected response format
        console.warn("Unexpected API response format:", response.data);
        throw new Error("Unexpected API response");
      }
    } catch (error) {
      console.error(`Error ${tweet.isScheduleEnabled ? 'scheduling' : 'posting'} tweet:`, error);
      
      let errorMessage = `An unknown error occurred while ${tweet.isScheduleEnabled ? 'scheduling' : 'posting'}.`;
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || 
                      (error.response?.status === 401 ? 
                       "X Authentication failed. Reconnect the agent." : 
                       `Server connection error during ${tweet.isScheduleEnabled ? 'scheduling' : 'posting'}.`);
        
        // Additional details if available
        if (error.response?.data?.details) {
          errorMessage += ` (${error.response.data.details})`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Update state to show error
      setModalState({
        ...modalState,
        tweet: {
          ...tweet,
          stage: "error",
          progress: 0,
          isLoading: false
        }
      });
      
      toast({
        title: `Failed to ${tweet.isScheduleEnabled ? 'Schedule' : 'Post'} Tweet`,
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return {
    fetchGenerationsInfo,
    closeTweetModal,
    handleTweetTextChange,
    handleTweetInputChange,
    generateTweet,
    postTweet
  };
}; 