"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const timeSlots = [
  { time: "9:00 AM - 11:00 AM", engagement: 2.4, audience: "Tech professionals" },
  { time: "12:00 PM - 2:00 PM", engagement: 1.8, audience: "General" },
  { time: "4:00 PM - 6:00 PM", engagement: 2.1, audience: "After work" },
];

const recommendations = [
  "Schedule important announcements between 9 AM - 11 AM",
  "Engagement peaks during lunch hours (12 PM - 2 PM)",
  "Technical content performs best in morning slots",
];

export function PostingTimes() {
  return (
    <div className="space-y-6 pt-4">
      <div>
        <h4 className="mb-4 text-sm font-medium">Optimal Posting Times</h4>
        <div className="space-y-3">
          {timeSlots.map((slot) => (
            <Card key={slot.time} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{slot.time}</div>
                  <div className="text-sm text-muted-foreground">
                    {slot.audience}
                  </div>
                </div>
                <Badge variant="secondary">
                  {slot.engagement}x engagement
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-4 text-sm font-medium">Recommendations</h4>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex items-center space-x-2 rounded-lg border p-3"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm">{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}