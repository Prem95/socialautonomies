"use client";

import { EditAgentModal } from "./edit-agent-modal";
import { TweetModal } from "./tweet-modal";
import { AutoTweetModal } from "./auto-tweet-modal";
import { AutoEngageModal } from "./auto-engage-modal";
import { ModalProps } from "./modal-types";

export function DashboardModals(props: ModalProps) {
  return (
    <>
      <EditAgentModal {...props} />
      <TweetModal {...props} />
      <AutoTweetModal {...props} />
      <AutoEngageModal {...props} />
    </>
  );
} 