"use client";

import { useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ModalProps } from "./modal-types";

// Create a schema for agent editing
const editAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  goal: z.string().min(1, "Goal is required"),
  language: z.string().min(1, "Language is required")
});

type EditAgentFormValues = z.infer<typeof editAgentSchema>;

export function EditAgentModal({ modalState, setModalState, setAgents }: ModalProps) {
  const { toast } = useToast();

  // Edit Agent form
  const editForm = useForm<EditAgentFormValues>({
    resolver: zodResolver(editAgentSchema),
    defaultValues: {
      name: "",
      goal: "",
      language: "en-US"
    }
  });

  // Set form values when edit modal opens with an agent
  useEffect(() => {
    if (modalState.edit.isOpen && modalState.edit.agent) {
      editForm.reset({
        name: modalState.edit.agent.name,
        goal: modalState.edit.agent.goal,
        language: modalState.edit.agent.language || "en-US",
      });
    }
  }, [modalState.edit.isOpen, modalState.edit.agent, editForm]);

  // Handle closing edit modal
  const closeEditModal = () => {
    setModalState({
      ...modalState,
      edit: {
        isOpen: false,
        agent: null
      }
    });
  };

  // Handle edit agent form submission
  const handleEditAgentSubmit = async (data: EditAgentFormValues) => {
    if (!modalState.edit.agent) return;

    setModalState({
      ...modalState,
      actionLoading: `update_${modalState.edit.agent.agentId}`,
    });

    try {
      const response = await axios.put(`/api/agents/${modalState.edit.agent.agentId}`, data);
      const updatedAgent = response.data;

      // Update agent in state
      setAgents((currentAgents) => 
        currentAgents.map((a) => (a.agentId === modalState.edit.agent?.agentId ? updatedAgent : a))
      );

      toast({
        title: "Agent Updated",
        description: "Agent has been successfully updated",
      });

      closeEditModal();
    } catch (error) {
      console.error("Error updating agent:", error);
      
      let errorMessage = "Failed to update agent";
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setModalState({
        ...modalState,
        actionLoading: null
      });
    }
  };

  return (
    <Dialog 
      open={modalState.edit.isOpen} 
      onOpenChange={(open) => !open && closeEditModal()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update your agent's details. These changes will not affect the agent's connection status.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleEditAgentSubmit)} className="space-y-4 py-4">
            <FormField
              control={editForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Agent" {...field} disabled={modalState.actionLoading === `update_${modalState.edit.agent?.agentId}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={editForm.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Goal</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What is this agent's purpose?" 
                      {...field} 
                      disabled={modalState.actionLoading === `update_${modalState.edit.agent?.agentId}`}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={editForm.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    disabled={modalState.actionLoading === `update_${modalState.edit.agent?.agentId}`}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeEditModal}
                disabled={modalState.actionLoading === `update_${modalState.edit.agent?.agentId}`}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={modalState.actionLoading === `update_${modalState.edit.agent?.agentId}`}
              >
                {modalState.actionLoading === `update_${modalState.edit.agent?.agentId}` && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 