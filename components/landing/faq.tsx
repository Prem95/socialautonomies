"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do AI agents work?",
    answer: "Our AI agents use advanced language models to understand context and generate human-like responses. They learn from your preferences and engagement patterns to maintain authentic interactions."
  },
  {
    question: "Is it safe to use automated X tools?",
    answer: "Yes, our platform follows X's automation rules and guidelines. We implement rate limiting and safety measures to ensure your account remains in good standing."
  },
  {
    question: "Can I customize the agent's behavior?",
    answer: "Absolutely! You can set specific topics, tone of voice, engagement rules, and posting schedules for each agent to match your brand's unique style."
  },
  {
    question: "What kind of analytics do you provide?",
    answer: "We offer comprehensive analytics including engagement rates, follower growth, post performance, and audience insights to help you measure and optimize your X presence."
  }
];

export function LandingFAQ() {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-3xl font-bold">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}