import { PrivacyPolicy } from "@/components/landing/privacy-policy";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Social Autonomies",
  description: "Learn how Social Autonomies protects your privacy and handles your personal information. Comprehensive privacy policy covering data collection, usage, and your rights.",
  keywords: "privacy policy, data protection, GDPR, CCPA, social media automation, AI agents",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
} 