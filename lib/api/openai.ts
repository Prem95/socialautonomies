import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTweet(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a X expert that creates engaging tweets.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 280,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating tweet:", error);
    throw error;
  }
}