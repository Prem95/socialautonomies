import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefits: string[];
  color: string;
}

export function FeatureCard({ icon: Icon, title, description, benefits, color }: FeatureCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-lg">
      <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${color}`} />
      
      <CardHeader>
        <div className="mb-4 inline-flex rounded-lg bg-background/95 p-3 backdrop-blur">
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="font-heading">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-2">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-center text-sm">
              <div className="mr-2 h-1 w-1 rounded-full bg-primary" />
              {benefit}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}