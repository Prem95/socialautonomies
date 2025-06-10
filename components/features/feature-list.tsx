import { Bot, Zap, Shield, BarChart, Users, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Agents",
    description: "Intelligent agents that understand context and generate human-like responses"
  },
  {
    icon: Zap,
    title: "Smart Automation",
    description: "Automated posting, liking, and retweeting based on your preferences"
  },
  {
    icon: Shield,
    title: "Advanced Security",
    description: "Enterprise-grade security with encryption and rate limiting"
  },
  {
    icon: BarChart,
    title: "Analytics Dashboard",
    description: "Comprehensive insights into your X performance"
  },
  {
    icon: Users,
    title: "Audience Growth",
    description: "Smart follower targeting and engagement strategies"
  },
  {
    icon: MessageSquare,
    title: "Content Management",
    description: "Schedule and manage your content calendar effortlessly"
  }
];

export function FeatureList() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="mb-4 inline-block rounded-lg bg-primary/10 p-3">
              <feature.icon className="h-6 w-6" />
            </div>
            <CardTitle>{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
              {[...Array(3)].map((_, j) => (
                <li key={j}>Feature benefit {j + 1}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}