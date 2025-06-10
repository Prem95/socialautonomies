"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Globe, ImageIcon, Film, ListChecks, Smile, CalendarDays, Sparkles, Clock, Send } from "lucide-react";
import { ModalProps } from "./modal-types";
import { useTweetModalUtils } from "./tweet-modal-utils";

export function TweetModal({ modalState, setModalState }: ModalProps) {
  const {
    fetchGenerationsInfo,
    closeTweetModal,
    handleTweetTextChange,
    handleTweetInputChange,
    generateTweet,
    postTweet
  } = useTweetModalUtils(modalState, setModalState);

  // Fetch generations info when modal opens
  useEffect(() => {
    if (modalState.tweet.isOpen && !modalState.tweet.generationsInfo) {
      fetchGenerationsInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.tweet.isOpen]);

  // Character count with circular progress
  const characterCount = modalState.tweet.text.length;
  const maxCharacters = 280;
  const characterPercentage = (characterCount / maxCharacters) * 100;
  const remainingCharacters = maxCharacters - characterCount;
  
  const getCharacterCountColor = () => {
    if (characterCount > maxCharacters) return "text-red-500";
    if (characterCount > 260) return "text-amber-500";
    if (characterCount > 200) return "text-blue-500";
    return "text-muted-foreground";
  };

  const getCircleColor = () => {
    if (characterCount > maxCharacters) return "stroke-red-500";
    if (characterCount > 260) return "stroke-amber-500";
    if (characterCount > 200) return "stroke-blue-500";
    return "stroke-blue-500";
  };

  // Step indicators
  const getCurrentStep = () => {
    if (modalState.tweet.stage === "generating") return 1;
    if (modalState.tweet.stage === "posting") return 2;
    if (modalState.tweet.stage === "complete") return 3;
    return 0;
  };

  const steps = [
    { label: "Compose", icon: Sparkles },
    { label: "Generate", icon: Bot },
    { label: "Review", icon: Send }
  ];

  return (
    <Dialog 
      open={modalState.tweet.isOpen} 
      onOpenChange={closeTweetModal}
    >
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {modalState.tweet.isScheduleEnabled ? "Schedule Tweet" : "Create Tweet"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {modalState.tweet.isScheduleEnabled 
                  ? "Schedule your tweet"
                  : "Write your own engaging tweet"
                }
              </DialogDescription>
            </div>
            
            {/* Step Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index === getCurrentStep();
                const isCompleted = index < getCurrentStep();
                
                return (
                  <div key={step.label} className="flex items-center">
                    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      isActive 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                        : isCompleted 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      <StepIcon className="w-3 h-3" />
                      <span>{step.label}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-2 h-px bg-gray-300 dark:bg-gray-600 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogHeader>
        
        {/* Enhanced Progress Indicator */}
        {(modalState.tweet.stage === "generating" || modalState.tweet.stage === "posting") && (
          <Card className="mb-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Progress 
                    value={modalState.tweet.progress} 
                    className="h-2"
                  />
                  <div 
                    className="absolute top-0 h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${modalState.tweet.progress}%`,
                      background: modalState.tweet.stage === "generating"
                        ? 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)' 
                        : 'linear-gradient(90deg, #10b981, #3b82f6)',
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="relative">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <div className="absolute inset-0 h-4 w-4 animate-ping rounded-full bg-blue-400/20" />
                    </div>
                    <span>
                      {modalState.tweet.stage === "generating" 
                        ? "Crafting your perfect tweet" 
                        : "Publishing to X"
                      }
                    </span>
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6 py-2">
          {/* Left Column: Context Inputs */}
          <Card className="h-fit">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className="font-medium text-sm">Context & Instructions</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="context" className="text-sm font-medium">
                    Context <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="context"
                    name="context"
                    placeholder="What should your tweet be about? Share a topic, event, or specific instruction..."
                    value={modalState.tweet.context}
                    onChange={handleTweetTextChange}
                    rows={3}
                    className="resize-none focus:ring-2 focus:ring-blue-500/20 border-gray-200 dark:border-gray-700"
                    disabled={modalState.tweet.isLoading || modalState.tweet.stage !== "idle"}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium">Reference URL</Label>
                  <Input 
                    id="url" 
                    name="url" 
                    placeholder="https://example.com" 
                    value={modalState.tweet.url} 
                    onChange={handleTweetInputChange} 
                    disabled={modalState.tweet.isLoading || modalState.tweet.stage !== "idle"}
                    className="focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="xAccountToTag" className="text-sm font-medium">Tag Account</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input 
                      id="xAccountToTag" 
                      name="xAccountToTag" 
                      placeholder="username" 
                      value={modalState.tweet.xAccountToTag} 
                      onChange={handleTweetInputChange} 
                      disabled={modalState.tweet.isLoading || modalState.tweet.stage !== "idle"}
                      className="pl-7 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  {modalState.tweet.xAccountToTag && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        @{modalState.tweet.xAccountToTag}
                      </Badge>
                      will be included in your tweet
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Right Column: Tweet Composer */}
          <Card className="flex flex-col">
            <CardContent className="p-4 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-orange-500" />
                <h3 className="font-medium text-sm">Tweet Preview</h3>
              </div>
              
              {/* Tweet Content Area */}
              <div className="border rounded-xl p-4 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800/50 min-h-[200px] flex flex-col">
                <div className="flex gap-3 flex-1">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5 text-white" />
                  </div>

                  {/* Tweet Input */}
                  <div className="flex-1 space-y-3">
                    {modalState.tweet.stage === "generating" ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                          <div className="relative">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <Sparkles className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <p className="text-sm text-muted-foreground">Generating your tweet...</p>
                        </div>
                      </div>
                    ) : (
                      <Textarea
                        id="tweet"
                        name="tweet"
                        placeholder="What's happening?"
                        value={modalState.tweet.text}
                        onChange={handleTweetTextChange}
                        rows={6}
                        maxLength={280}
                        className={`w-full border-none bg-transparent resize-none text-base placeholder:text-gray-400 focus:ring-0 focus:outline-none ${
                          modalState.tweet.text.length > 280 ? 'text-red-500' : 'text-foreground'
                        }`}
                        disabled={modalState.tweet.stage === "posting" || (!modalState.tweet.generatedText && !modalState.tweet.text && modalState.tweet.stage === "idle" && !modalState.tweet.context && !modalState.tweet.url && !modalState.tweet.xAccountToTag)}
                      />
                    )}
                  </div>
                </div>

                {modalState.tweet.stage !== "generating" && (
                  <>
                    <Button variant="ghost" className="text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 self-start text-sm font-medium px-3 py-1 h-auto rounded-full">
                      <Globe className="w-4 h-4 mr-2" />
                      Everyone can reply
                    </Button>
                    
                    {/* Divider */}
                    <div className="border-t my-3 -mx-4"></div>

                    {/* Bottom Toolbar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[ImageIcon, Film, ListChecks, Smile, CalendarDays].map((Icon, idx) => (
                          <Button key={idx} variant="ghost" size="sm" className="rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 w-8 h-8 p-0">
                            <Icon className="w-4 h-4" />
                          </Button>
                        ))}
                      </div>

                      {/* Enhanced Character Counter */}
                      {characterCount > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8">
                            <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray="100, 100"
                                className="text-gray-200 dark:text-gray-700"
                              />
                              <path
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeDasharray={`${Math.min(characterPercentage, 100)}, 100`}
                                className={getCircleColor()}
                              />
                            </svg>
                            {remainingCharacters < 20 && (
                              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${getCharacterCountColor()}`}>
                                {remainingCharacters}
                              </span>
                            )}
                          </div>
                          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {modalState.tweet.text.length > 280 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full" />
                  Tweet exceeds character limit
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
                 {/* Schedule Section - Compact Layout */}
         <div className="pt-4 border-t">
           <div className="flex flex-col sm:flex-row sm:items-start gap-4">
             {/* Schedule Toggle - Compact */}
             <div className="flex items-center gap-3 flex-shrink-0">
               <Switch
                 id="schedule-tweet"
                 checked={modalState.tweet.isScheduleEnabled}
                 onCheckedChange={(checked) => setModalState({
                   ...modalState,
                   tweet: {
                     ...modalState.tweet,
                     isScheduleEnabled: checked
                   }
                 })}
                 disabled={modalState.tweet.isLoading}
               />
               <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4 text-blue-500" />
                 <Label htmlFor="schedule-tweet" className="cursor-pointer font-medium">
                   Schedule for later
                 </Label>
               </div>
             </div>
         
             {/* Schedule Time Picker - Inline */}
             {modalState.tweet.isScheduleEnabled && (
               <div className="flex-1 space-y-2 animate-in slide-in-from-top-2 duration-200">
                 <Label htmlFor="schedule-time" className="text-sm font-medium">When should this be posted?</Label>
                 <Input
                   id="schedule-time"
                   type="datetime-local"
                   value={modalState.tweet.scheduleTime}
                   onChange={(e) => setModalState({
                     ...modalState,
                     tweet: {
                       ...modalState.tweet,
                       scheduleTime: e.target.value
                     }
                   })}
                   min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                   disabled={modalState.tweet.isLoading}
                   className="w-full focus:ring-2 focus:ring-blue-500/20"
                 />
                 {!modalState.tweet.scheduleTime && (
                   <p className="text-xs text-amber-600 flex items-center gap-1">
                     <span className="w-1 h-1 bg-amber-500 rounded-full" />
                     Please select a future date and time
                   </p>
                 )}
                 {modalState.tweet.scheduleTime && 
                   new Date(modalState.tweet.scheduleTime) < new Date() && (
                   <p className="text-xs text-red-500 flex items-center gap-1">
                     <span className="w-1 h-1 bg-red-500 rounded-full" />
                     Cannot schedule for a past time
                   </p>
                 )}
               </div>
             )}
           </div>
         </div>

        {/* Generations Info */}
        {modalState.tweet.stage !== 'complete' && modalState.tweet.stage !== 'posting' && (
          <div className="flex justify-center py-3 border-t">
            {modalState.tweet.generationsInfo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                <span>
                  <span className={`font-medium ${modalState.tweet.generationsInfo.remaining < 3 ? 'text-amber-600' : 'text-blue-600'}`}>
                    {modalState.tweet.generationsInfo.remaining}
                  </span>
                  {' '}generation{modalState.tweet.generationsInfo.remaining !== 1 ? 's' : ''} remaining
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading generation info...</span>
              </div>
            )}
          </div>
        )}
        
        {/* Enhanced Status Messages */}
        {modalState.tweet.stage === "complete" && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium">
                  {modalState.tweet.isScheduleEnabled 
                    ? "Tweet successfully scheduled!" 
                    : "Tweet successfully posted!"
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        
        {modalState.tweet.stage === "error" && (
          <Card className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="font-medium">
                  {modalState.tweet.isScheduleEnabled 
                    ? "Failed to schedule tweet" 
                    : "Failed to post tweet"
                  }. Please try again.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
        
                 <DialogFooter className="pt-4 border-t">
           <div className="flex flex-col sm:flex-row gap-3 w-full">
             {/* Cancel Button */}
             <Button
               type="button"
               variant="outline"
               onClick={closeTweetModal}
               disabled={modalState.tweet.isLoading}
               className="sm:w-32"
             >
               Cancel
             </Button>

             {/* Action Buttons - Balanced Layout */}
             <div className="flex gap-2 flex-1">
               {/* Generate Button */}
               {modalState.tweet.stage === "idle" && 
                 !(modalState.tweet.isScheduleEnabled && modalState.tweet.text.trim()) && (
                 <Button 
                   type="button"
                   variant={modalState.tweet.generatedText ? "secondary" : "default"}
                   onClick={() => {
                     console.log("Generate button clicked:", {
                       isRegeneration: !!modalState.tweet.generatedText,
                       hasContext: !!modalState.tweet.context,
                       hasUrl: !!modalState.tweet.url,
                       hasTag: !!modalState.tweet.xAccountToTag,
                       generationsRemaining: modalState.tweet.generationsInfo?.remaining
                     });
                     generateTweet();
                   }}
                   disabled={
                     modalState.tweet.isLoading || 
                     !modalState.tweet.generationsInfo || 
                     (
                       modalState.tweet.generatedText && 
                       modalState.tweet.generationsInfo.remaining <= 0
                     ) || 
                     (!modalState.tweet.generatedText && 
                       !modalState.tweet.context && 
                       !modalState.tweet.url && 
                       !modalState.tweet.xAccountToTag
                     )
                   }
                   className={`flex-1 gap-2 font-medium transition-all duration-200 ${ 
                     !modalState.tweet.generatedText && !modalState.tweet.isLoading && (modalState.tweet.context || modalState.tweet.url || modalState.tweet.xAccountToTag)
                       ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' 
                       : ''
                   }`}
                 >
                   {modalState.tweet.isLoading ? (
                     <>
                       <Loader2 className="h-4 w-4 animate-spin" />
                       <span>Generating...</span>
                     </>
                   ) : modalState.tweet.generatedText ? (
                     <>
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M3 2v6h6"></path>
                         <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
                       </svg>
                       <span>Regenerate</span>
                       {modalState.tweet.generationsInfo && modalState.tweet.generationsInfo.remaining > 0 && (
                         <Badge variant="secondary" className="ml-1 text-xs">
                           {modalState.tweet.generationsInfo.remaining} left
                         </Badge>
                       )}
                     </>
                   ) : (
                     <>
                       <Sparkles className="w-4 h-4" />
                       <span>Generate Tweet</span>
                     </>
                   )}
                 </Button>
               )}

               {/* Post Button */}
               <Button 
                 type="button"
                 onClick={postTweet} 
                 disabled={
                   modalState.tweet.isLoading || 
                   !modalState.tweet.text.trim() || 
                   modalState.tweet.text.length > 280 || 
                   modalState.tweet.stage === "complete" || 
                   (modalState.tweet.isScheduleEnabled && 
                     (!modalState.tweet.scheduleTime || 
                      new Date(modalState.tweet.scheduleTime) < new Date())
                   )
                 }
                 className="flex-1 gap-2 font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
               >
                 {modalState.tweet.isLoading && modalState.tweet.stage === "posting" ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : modalState.tweet.isScheduleEnabled ? (
                   <Clock className="h-4 w-4" />
                 ) : (
                   <Send className="h-4 w-4" />
                 )}
                 {modalState.tweet.isScheduleEnabled ? "Schedule Tweet" : "Post Tweet"}
               </Button>
             </div>
           </div>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 