"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const topHashtags = [
  { tag: "#AI", count: 145, engagement: 2.3 },
  { tag: "#Tech", count: 98, engagement: 1.8 },
  { tag: "#Innovation", count: 76, engagement: 1.5 },
];

const topContent = [
  {
    type: "Question",
    examples: ["What's your take on...?", "How do you handle...?"],
    engagement: 2.8,
  },
  {
    type: "Tips",
    examples: ["Quick tip:", "Pro tip:"],
    engagement: 2.5,
  },
  {
    type: "News",
    examples: ["Breaking:", "Just announced:"],
    engagement: 2.1,
  },
];

export function ContentAnalysis() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <h4 className="mb-4 text-sm font-medium">Top Performing Hashtags</h4>
        <div className="space-y-2">
          {topHashtags.map((hashtag) => (
            <div
              key={hashtag.tag}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{hashtag.tag}</Badge>
                <span className="text-sm text-muted-foreground">
                  {hashtag.count} uses
                </span>
              </div>
              <div className="text-sm">
                {hashtag.engagement}x engagement
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-4 text-sm font-medium">Best Performing Content Types</h4>
        <div className="space-y-2">
          {topContent.map((content) => (
            <Card key={content.type} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h5 className="font-medium">{content.type}</h5>
                <Badge variant="outline">
                  {content.engagement}x engagement
                </Badge>
              </div>
              <div className="space-y-1">
                {content.examples.map((example, i) => (
                  <div
                    key={i}
                    className="text-sm text-muted-foreground"
                  >
                    {example}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}