import { Bot } from "lucide-react";
import Link from "next/link";

interface AuthHeaderProps {
  heading: string;
  text: string;
}

export function AuthHeader({ heading, text }: AuthHeaderProps) {
  return (
    <div className="flex flex-col space-y-2 text-center">
      <Link href="/" className="mx-auto mb-4 flex items-center space-x-2">
        <Bot className="h-6 w-6" />
        <span className="font-bold">Social Autonomies</span>
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}