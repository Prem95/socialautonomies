# Social Autonomies

AI-driven X automation platform for creating intelligent agents that can post, engage, and analyze performance automatically. The idea is to allow users to organically grow their X accounts. 

![Social Autonomies Platform](/public/image.png)

Tweet - [What Can It Do?](https://x.com/defichemist95/status/1932305977031667827)

## Features

- AI-powered tweet generation
- Analytics and performance tracking  
- Automated engagement and replies
- Tweet scheduling
- Subscription management

## 🍴 Fork & Use

**Feel free to fork this repository and use it for your own projects!**

1. Click the **"Fork"** button at the top of this repository
2. Clone your forked version to your local machine
3. Customize it to your needs
4. Deploy your own version

This project is open source under the MIT license - you're free to use, modify, and distribute it however you like.

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/Prem95/socialautonomies.git
   cd socialautonomies
   npm install
   ```

2. **Environment setup**
   ```bash
   cp env.example .env
   # Fill in your API keys (Openrouter, Twitter, Supabase, Stripe)
   ```

3. **Database setup**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Run**
   ```bash
   npm run dev
   ```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Auth**: Supabase
- **Payments**: Stripe

## Environment Variables

See `env.example` for all required configuration.

## 💡 Inspiration & Integration

This project was inspired by and integrates with several amazing open-source libraries:

### Core Twitter Automation
- **[agent-twitter-client](https://github.com/elizaOS/agent-twitter-client)** - Primary X client used for automation
- **[@0xindie/agent-twitter-client](https://www.npmjs.com/package/@0xindie/agent-twitter-client)** - Alternative X client implementation

### Learning Resources
- **[Building Agents](https://cmdcolin.github.io/posts/2022-08-26-twitterbot)**

### Additional Libraries
- **[twitter-scraper](https://github.com/the-convocation/twitter-scraper)** - Powerful X scraping capabilities for data collection

### Integration Opportunities
These libraries can be easily integrated into Social Autonomies to extend functionality:
- Enhanced scraping capabilities
- Alternative authentication methods  

## License

MIT - see [LICENSE](LICENSE) for details.

## Contributing

Fork the repository and submit pull requests for any improvements! 