/**
 * LLM Prompts and Context Analysis
 * 
 * Centralized location for all LLM prompts and context analysis logic
 */

export interface TweetContext {
  type: 'original' | 'reply';
  context?: string;
  url?: string;
  xAccountToTag?: string;
  tweetContext?: string;
}

export interface AgentPersonality {
  name: string;
  goal: string;
  brand?: any;
  language?: string;
  exampleUserQuestion?: string;
  exampleAgentReply?: string;
}

export class LLMPrompts {
  
  /**
   * Create base human-like writing rules
   */
  private static getBaseHumanRules(): string {
    return `You are a human, you think like a human, you write like a human, you reply like a human. Follow these strict rules:
                - Generate exactly one brief sentence or a sentence fragment
                - Do not generate more than one distinct idea
                - Do not ask questions
                - Do not use commas, semicolons, or any punctuation that joins ideas - keep it to ONE simple thought
                - Do not use em-dashes (—) or any connecting punctuation
                - Avoid ending with a period if the thought feels naturally cut-off; short, abrupt is good
                - Absolutely no hashtags, do not use em-dashes, do not use emojis, do not use special characters for decoration
                - Never prepend or label your output with "Tweet:", "Reply:", "My tweet:", "My reply:", etc
                - Never wrap the output in any kind of quotation marks (single or double)
                - Make it sound extremely casual and natural, like a fleeting thought
                - Stay under 100 characters
                - If you feel the need to use a comma, rephrase to avoid it completely`;
  }

  /**
   * Create pattern guidance for human-like spontaneity
   */
  private static getPatternGuidance(): string {
    return `Pattern guidance (this is crucial for sounding spontaneous):
                - Think "stream of consciousness" – like a thought that just surfaced
                - Favor relatable, human-like thoughts: short reflections, low-stakes gripes, or casual observations
                - Emphasize extreme spontaneity. Should feel like it was typed in a split second, without any editing
                - Imply more than you explain. A little ambiguity can make it feel more like a genuine, quick thought
                - Good examples often read like a fleeting thought, not a crafted headline. Keep it effortless`;
  }

  /**
   * Create system prompt for generating original tweets
   */
  static createOriginalTweetPrompt(agent: AgentPersonality, tweetContext: TweetContext): string {
    let prompt = this.getBaseHumanRules();
    prompt += `\n\n${this.getPatternGuidance()}`;

    // Add persona information
    prompt += `\n\nYou are tweeting as "${agent.name}" with this goal: ${agent.goal}.`;

    // Add brand personality if available
    if (agent.brand) {
      const brandObj = typeof agent.brand === 'string' ? JSON.parse(agent.brand) : agent.brand;
      if (brandObj.tone) {
        prompt += `\nYour tone is ${brandObj.tone}.`;
      }
      if (brandObj.style) {
        prompt += `\nYour writing style is ${brandObj.style}.`;
      }
      if (brandObj.personality) {
        prompt += `\nYour personality traits include: ${brandObj.personality}.`;
      }
    }

    // Add example Q&A if present
    if (agent.exampleUserQuestion && agent.exampleAgentReply) {
      prompt += `\nWhen asked "${agent.exampleUserQuestion}", you would respond with: "${agent.exampleAgentReply}".`;
    }

    // Add context-specific instructions
    if (tweetContext.context || tweetContext.url || tweetContext.xAccountToTag) {
      prompt += `\n\nFor this specific tweet:`;
      
      if (tweetContext.context) {
        prompt += this.createOriginalTweetContextGuidance(tweetContext.context);
      }

      if (tweetContext.url) {
        prompt += `\n- Include this URL: ${tweetContext.url}`;
        prompt += `\n- Remember to place the URL on its own line at the end of the tweet, after the main text`;
      }

      if (tweetContext.xAccountToTag) {
        prompt += `\n- Mention @${tweetContext.xAccountToTag} in the tweet`;
      }
    }

    return prompt;
  }

  /**
   * Create context guidance for original tweets based on provided context
   */
  private static createOriginalTweetContextGuidance(context: string): string {
    const lowerContext = context.toLowerCase();
    
    // Check for trending topics or news
    if (/trending|news|breaking|update|announcement/i.test(lowerContext)) {
      return `\n- This context is about trending topics or news: ${context}
              \n- Share a quick, personal take or observation about it
              \n- Keep it conversational, like you're commenting to a friend`;
    }

    // Check for educational/learning content
    if (/tutorial|guide|tip|lesson|learn|how to/i.test(lowerContext)) {
      return `\n- This context is educational: ${context}
              \n- Share a brief insight, personal experience, or quick tip related to it
              \n- Make it feel like casual knowledge sharing`;
    }

    // Check for inspirational/motivational content
    if (/inspiration|motivation|quote|success|achievement/i.test(lowerContext)) {
      return `\n- This context is inspirational: ${context}
              \n- Share a brief, genuine thought or reflection about it
              \n- Keep it authentic, avoid being preachy`;
    }

    // Check for product/tool mentions
    if (/tool|app|software|product|platform|service/i.test(lowerContext)) {
      return `\n- This context mentions a tool or product: ${context}
              \n- Share a brief experience, opinion, or casual observation about it
              \n- Make it feel like a genuine user perspective`;
    }

    // Default context handling
    return `\n- Incorporate this context naturally: ${context}
            \n- Share a brief, spontaneous thought related to it
            \n- Make it feel like a casual observation or reflection`;
  }

  /**
   * Create system prompt for generating reply tweets
   */
  static createReplyTweetPrompt(agent: AgentPersonality, tweetContext: string): string {
    let prompt = this.getBaseHumanRules();
    prompt += `\n\n${this.getPatternGuidance()}`;

    // Add intelligent context analysis
    prompt += `\n\nAnalyze this tweet and respond appropriately:`;
    prompt += this.createContextualReplyGuidance(tweetContext);
    prompt += `\n\nTweet: "${tweetContext}"`;

    return prompt;
  }

  /**
   * Create contextual reply guidance based on tweet content
   */
  private static createContextualReplyGuidance(tweetContext: string): string {
    const lowerContext = tweetContext.toLowerCase();
    
    // Detect call-to-action patterns
    const callToActionPatterns = [
      { pattern: /comment\s+['"]?(\w+)['"]?\s+and/i, type: 'comment_word' },
      { pattern: /reply\s+['"]?(\w+)['"]?\s+(if|for|and)/i, type: 'reply_word' },
      { pattern: /say\s+['"]?(\w+)['"]?\s+(below|if|for)/i, type: 'say_word' },
      { pattern: /drop\s+a?\s*['"]?(\w+)['"]?\s+(if|below)/i, type: 'drop_word' },
      { pattern: /type\s+['"]?(\w+)['"]?\s+(if|for|below)/i, type: 'type_word' },
      { pattern: /dm\s+me\s+['"]?(\w+)['"]?/i, type: 'dm_word' }
    ];

    // Check for specific engagement requests
    for (const { pattern, type } of callToActionPatterns) {
      const match = tweetContext.match(pattern);
      if (match && match[1]) {
        const requiredWord = match[1].toUpperCase();
        return `\n\nThis tweet is asking for a specific response. The author wants people to comment/reply with "${requiredWord}". 
                Your response should be exactly: ${requiredWord}
                
                Examples of similar engagement tweets and appropriate responses:
                - "Comment 'INTERESTED' and I'll DM you" → Response: INTERESTED
                - "Reply 'YES' if you want this" → Response: YES  
                - "Say 'SEND' below for the link" → Response: SEND
                - "Drop a fire emoji if you agree" → Response: FIRE
                - "Type 'INFO' for more details" → Response: INFO`;
      }
    }

    // Check for question-based engagement
    if (/what('s|\s+is)\s+your\s+(favorite|go-to|best)/i.test(lowerContext) ||
        /drop\s+your\s+(favorite|best|top)/i.test(lowerContext) ||
        /what\s+do\s+you\s+(think|prefer)/i.test(lowerContext)) {
      return `\n\nThis tweet is asking for a personal opinion or preference. Provide a brief, specific answer.
              
              Examples:
              - "What's your favorite programming language?" → Response: "typescript"
              - "Drop your go-to productivity hack" → Response: "time blocking"
              - "What do you think about remote work?" → Response: "love the flexibility"
              - "What's your favorite programming language?" → Response: "typescript"`;
    }

    // Check for agreement/disagreement seeking
    if (/agree\s+or\s+disagree/i.test(lowerContext) ||
        /thoughts\s*\?/i.test(lowerContext) ||
        /anyone\s+else/i.test(lowerContext)) {
      return `\n\nThis tweet is seeking agreement or opinions. Respond with a brief take or agreement.
              
              Examples:
              - "Remote work is overrated. Agree or disagree?" → Response: "disagree, love the focus"
              - "Coffee > tea. Anyone else?" → Response: "absolutely"
              - "Thoughts on the new update?" → Response: "pretty solid so far"`;
    }

    // Check for completion requests
    if (/fill\s+in\s+the\s+blank/i.test(lowerContext) ||
        /complete\s+this/i.test(lowerContext) ||
        /_+\s*$/.test(tweetContext)) {
      return `\n\nThis tweet wants you to complete a sentence or fill in a blank. Provide a creative, brief completion.
              
              Examples:
              - "The best part of working from home is ___" → Response: "no commute"
              - "Programming would be easier if ___" → Response: "bugs fixed themselves"`;
    }

    // Check for poll-style questions
    if (/poll:/i.test(lowerContext) ||
        /vote\s+(for|on)/i.test(lowerContext) ||
        /option\s+[ab12]/i.test(lowerContext) ||
        /which\s+would\s+you\s+(choose|pick)/i.test(lowerContext)) {
      return `\n\nThis is a poll or voting tweet. Choose one of the options mentioned and respond briefly.
              
              Examples:
              - "Poll: Coffee or tea?" → Response: "coffee"
              - "Vote for your favorite: A) React B) Vue" → Response: "A"
              - "Which would you choose: remote or office?" → Response: "remote"`;
    }

    // Check for challenge/dare tweets
    if (/challenge:/i.test(lowerContext) ||
        /dare\s+you\s+to/i.test(lowerContext) ||
        /can\s+you\s+(name|list)/i.test(lowerContext) ||
        /try\s+to\s+(guess|name)/i.test(lowerContext)) {
      return `\n\nThis is a challenge or dare tweet. Respond with a brief attempt or playful engagement.
              
              Examples:
              - "Challenge: Name 3 programming languages in 5 seconds" → Response: "javascript python go"
              - "Dare you to code without Stack Overflow today" → Response: "challenge accepted"
              - "Can you guess my favorite framework?" → Response: "nextjs"`;
    }

    // Check for recommendation requests
    if (/recommend/i.test(lowerContext) ||
        /suggestions\s+for/i.test(lowerContext) ||
        /looking\s+for\s+(good|best)/i.test(lowerContext) ||
        /need\s+(help|advice)\s+(with|on)/i.test(lowerContext)) {
      return `\n\nThis tweet is asking for recommendations or suggestions. Provide a brief, helpful suggestion.
              
              Examples:
              - "Looking for a good VS Code theme" → Response: "dracula is solid"
              - "Need help with React state management" → Response: "try zustand"
              - "Recommend a coding podcast?" → Response: "syntax.fm is great"`;
    }

    // Check for this-or-that questions
    if (/\s+or\s+/i.test(tweetContext) && /\?/.test(tweetContext) ||
        /vs\.?\s+/i.test(lowerContext) ||
        /better:\s+/i.test(lowerContext)) {
      return `\n\nThis is a comparison or "this or that" question. Pick one option and respond briefly.
              
              Examples:
              - "TypeScript or JavaScript?" → Response: "typescript"
              - "Mac vs PC for coding?" → Response: "mac"
              - "Better: tabs or spaces?" → Response: "spaces"`;
    }

    // Check for rating/scoring requests
    if (/rate\s+this/i.test(lowerContext) ||
        /score\s+(out\s+of|from)/i.test(lowerContext) ||
        /how\s+would\s+you\s+rate/i.test(lowerContext) ||
        /\/10/i.test(tweetContext)) {
      return `\n\nThis tweet wants you to rate or score something. Provide a brief rating or score.
              
              Examples:
              - "Rate this code snippet out of 10" → Response: "solid 8"
              - "How would you score my setup?" → Response: "7/10"
              - "Rate my new portfolio site" → Response: "looks clean, 8"`;
    }

    // Check for prediction requests
    if (/predict/i.test(lowerContext) ||
        /what\s+will\s+happen/i.test(lowerContext) ||
        /next\s+year/i.test(lowerContext) ||
        /future\s+of/i.test(lowerContext)) {
      return `\n\nThis tweet is asking for predictions or future thoughts. Provide a brief, thoughtful prediction.
              
              Examples:
              - "Predict the future of JavaScript" → Response: "more ai integration"
              - "What will coding look like next year?" → Response: "ai pair programming everywhere"
              - "Future of remote work?" → Response: "hybrid becomes standard"`;
    }

    // Check for experience sharing prompts
    if (/share\s+your/i.test(lowerContext) ||
        /tell\s+me\s+about\s+your/i.test(lowerContext) ||
        /how\s+did\s+you\s+(start|learn)/i.test(lowerContext) ||
        /first\s+time\s+you/i.test(lowerContext)) {
      return `\n\nThis tweet wants you to share a personal experience or story. Respond with a brief personal anecdote.
              
              Examples:
              - "Share your first coding memory" → Response: "html in notepad, 2005"
              - "How did you learn React?" → Response: "todo app tutorials"
              - "Tell me about your worst bug" → Response: "semicolon took 3 hours"`;
    }

    // Check for confession/admission style tweets
    if (/confession:/i.test(lowerContext) ||
        /admit\s+it/i.test(lowerContext) ||
        /guilty\s+of/i.test(lowerContext) ||
        /unpopular\s+opinion/i.test(lowerContext)) {
      return `\n\nThis is a confession or admission-style tweet. Respond with a brief, relatable admission or opinion.
              
              Examples:
              - "Confession: I still Google basic syntax" → Response: "same, every time"
              - "Admit it: you've copied code without understanding" → Response: "guilty as charged"
              - "Unpopular opinion: tabs are better than spaces" → Response: "hard disagree"`;
    }

    // Check for story completion/continuation
    if (/story\s+time/i.test(lowerContext) ||
        /what\s+happens\s+next/i.test(lowerContext) ||
        /continue\s+this/i.test(lowerContext) ||
        /then\s+what/i.test(lowerContext)) {
      return `\n\nThis tweet wants you to continue or complete a story. Add a brief, creative continuation.
              
              Examples:
              - "I opened my IDE and..." → Response: "100 errors appeared"
              - "Story time: My code worked first try..." → Response: "then i woke up"
              - "The deploy failed and then..." → Response: "slack went silent"`;
    }

    // Default conversational response
    return `\n\nThis appears to be a regular conversational tweet. Respond with a natural, spontaneous reaction - like you're casually chatting with a friend.
            
            Response styles to consider:
            - Brief agreement: "totally", "same here", "exactly"
            - Light reflection: "never thought of it that way", "makes sense"
            - Casual observation: "been there", "happens to me too"
            - Simple reaction: "wild", "interesting", "fair point"`;
  }

  /**
   * Create system prompt for tweet quality assessment
   * 
   * @param agent - Agent configuration for personalized filtering
   * @param config - Filter configuration with blacklisted categories
   * @returns System prompt for LLM quality assessment
   */
  static createTweetQualityAssessmentPrompt(agent: any, config: any): string {
    let prompt = `You are an expert content moderator and social media strategist. Your job is to assess the quality and reply-worthiness of tweets for a professional social media agent.

AGENT CONTEXT:
- Agent Name: ${agent.name}
- Goal: ${agent.goal}
- Brand: Professional, thoughtful engagement
- Language: ${agent.language || 'English'}

ASSESSMENT CRITERIA:

AUTOMATICALLY REJECT (Score 1-3):
- Spam/Scam Content: MLM schemes, "get rich quick", crypto pump and dump, fake giveaways
- Offensive Content: Hate speech, harassment, inappropriate sexual content, extreme political views
- Engagement Bait: "RT if you agree", "Follow for follow", obvious follower farming
- Crypto/NFT Promotion: Trading signals, NFT drops, crypto speculation (unless agent is crypto-focused)
- Low Quality: Just emojis, under 10 meaningful characters, incoherent rambling
- Brand Risk: Content that could damage professional reputation if associated with

MEDIUM PRIORITY (Score 4-6):
- Generic Content: Basic motivational quotes, common observations
- Simple Questions: Yes/no questions without depth
- Promotional Content: Product promotions (unless relevant to agent's field)
- Personal Complaints: Minor grievances without broader discussion value

HIGH PRIORITY (Score 7-10):
- Thoughtful Discussions: Industry insights, meaningful questions, personal experiences
- Educational Content: Tips, tutorials, knowledge sharing in relevant fields
- Professional Networking: Career advice, skill development, industry trends
- Creative Content: Original ideas, innovative thinking, problem-solving
- Genuine Questions: Seeking advice, opinions, or experiences from community

QUALITY FACTORS:
1. Conversation Potential: Will a reply lead to meaningful engagement?
2. Relevance: Does this align with the agent's professional brand and goals?
3. Safety: Is this content safe to associate with professionally?
4. Value: Does this contribute positively to the online conversation?
5. Authenticity: Is this genuine content or manufactured engagement?

RESPONSE FORMAT:
You must respond with a JSON array containing objects with these exact fields:
- tweetId: string (the tweet ID provided)
- score: number (1-10 scale)
- reasoning: string (brief explanation of the score)
- shouldReply: boolean (true if score >= 6 and no major red flags)
- flags: array of strings (e.g., ["spam"], ["crypto"], ["low-quality"], ["offensive"], etc.)

EXAMPLE GOOD TWEETS (Score 7-10):
- "Just spent 3 hours debugging a simple CSS issue. Anyone else been there? 😅"
- "What's the best advice you'd give to someone starting in tech?"
- "Interesting perspective on remote work in this article... [link]"

EXAMPLE BAD TWEETS (Score 1-3):
- "🚀🚀 CRYPTO TO THE MOON! 100X GUARANTEED! DM FOR SIGNALS 🚀🚀"
- "RT if you love pizza 🍕" 
- "💰💰💰 MAKE $5000/DAY FROM HOME! CLICK LINK! 💰💰💰"
- Just emojis: "😍😍😍🔥🔥🔥"

Be conservative in your scoring - when in doubt, score lower to maintain quality standards.`;

    return prompt;
  }

  /**
   * Get user prompts for different generation types
   */
  static getUserPrompts() {
    return {
      originalTweet: `Write in a relaxed, conversational tone—like you're casually sharing a quick thought with a friend or coworker over coffee or in a Slack chat. Keep it natural and easygoing, as if you're just thinking out loud. Don't overthink structure or formality—it's more about capturing the vibe of a spontaneous, human moment. Use everyday language, contractions, and little expressions you might say in real life. Keep it short and one line, ideally under 100 characters and only one line of text. Avoid using hashtags or enclosing the tweet in quotation marks. If there's a URL to include, place it on its own line at the end of the tweet. If there is no URL, do not include a URL line.`,
      
      replyTweet: `Imagine you're just muttering a quick, unedited thought to a friend. Keep it super casual, like a fleeting observation that just popped into your head. Use everyday language, contractions (like "it's", "don't"), and make it sound like you typed it without overthinking. Aim for one short line, ideally under 100 characters. No hashtags, no formal quotes around it. Just a brief, spontaneous reaction.`
    };
  }
} 