"use client";

import { Brain, Clock, Globe, BarChart3, MessageSquare, Shield } from "lucide-react";
import { FeatureCard } from "./feature-card";
import { features } from "@/config/features";

const iconMap = {
  Brain,
  Workflow: Clock,
  BarChart: BarChart3,
  Users: Globe,
  FileText: MessageSquare,
  Shield,
};

export function FeatureGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, i) => (
        <FeatureCard
          key={i}
          {...feature}
          icon={iconMap[feature.icon as keyof typeof iconMap]}
        />
      ))}
    </div>
  );
}