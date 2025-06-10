import { Bot, Zap, Shield, BarChart } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Agents",
    description: "Intelligent agents that understand your brand voice and engage authentically with your audience."
  },
  {
    icon: Zap,
    title: "Automated Engagement",
    description: "Smart interactions with likes, retweets, and follows to grow your presence organically."
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Enterprise-grade security to protect your accounts and data with advanced encryption."
  },
  {
    icon: BarChart,
    title: "Analytics Dashboard",
    description: "Comprehensive insights and metrics to track your growth and engagement performance."
  }
];

export function LandingFeatures() {
  return (
    <section className="container py-24">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-lg bg-primary/10 p-4">
              <feature.icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}