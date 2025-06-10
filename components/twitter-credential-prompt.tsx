"use client";

import { useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, ExternalLink, Info, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TwitterCredentialPromptProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  onSuccess: () => Promise<void>;
}

export function TwitterCredentialPrompt({
  isOpen,
  onClose,
  agentId,
  onSuccess
}: TwitterCredentialPromptProps) {
  const [cookies, setCookies] = useState({
    auth_token: '',
    ct0: '',
    twid: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'connecting' | 'deploying' | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDeploymentStatus('connecting');
    
    try {
      const response = await axios.post(`/api/agents/${agentId}/twitter-auth`, {
        cookies: cookies
      });
      
      if (response.data.success || response.status === 200) {
        setDeploymentStatus('deploying');
        toast({
          title: "X Account Connected",
          description: "Starting agent deployment...",
        });
        await onSuccess();
        onClose();
      } else {
        toast({
          title: "Connection Failed",
          description: response.data.error || "Please check your cookies and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Please verify your cookies and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setDeploymentStatus(null);
    }
  };
  
  const handleCookieChange = (key: keyof typeof cookies) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCookies(prev => ({
      ...prev,
      [key]: e.target.value
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Cookie name copied",
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            Connect X Account
          </DialogTitle>
          <DialogDescription>
            Get your browser cookies to connect your X account securely
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center">1</span>
                <span>Open <a href="https://x.com" target="_blank" className="text-blue-600 hover:underline font-medium">x.com <ExternalLink className="h-3 w-3 inline"/></a> and make sure you're logged in with the account you want to connect</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center">2</span>
                <span>Right click   Inspect or press F12  → Application → Cookies (Dropdown) → https://x.com</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center justify-center">3</span>
                <span>Find and copy these 3 cookie <code className="text-black font-bold">values</code> (auth_token, ct0, twid)</span>
              </li>
            </ol>
          </div>

          {/* Cookie Reference */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'auth_token', desc: 'Auth token (required)' },
              { name: 'ct0', desc: 'CSRF token (required)' },
              { name: 'twid', desc: 'User ID (required)' }
            ].map((cookie) => (
              <div key={cookie.name} className="border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <code className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{cookie.name}</code>
                </div>
                <p className="text-xs text-muted-foreground">{cookie.desc}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {[
                { key: 'auth_token' as const, label: 'auth_token' },
                { key: 'ct0' as const, label: 'ct0' },
                { key: 'twid' as const, label: 'twid' }
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    value={cookies[field.key]}
                    onChange={handleCookieChange(field.key)}
                    placeholder={`Paste ${field.label} value here`}
                    required
                    disabled={isSubmitting}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </div>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Your cookies are used once to establish the connection and are never stored permanently.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || Object.values(cookies).some(v => !v.trim())}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {deploymentStatus === 'connecting' ? 'Connecting...' : 
                     deploymentStatus === 'deploying' ? 'Deploying Agent...' : 
                     'Connecting...'}
                  </>
                ) : (
                  "Connect X Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 