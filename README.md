# Social Autonomies

AI-driven X automation platform for creating intelligent agents that can post, engage, and analyze performance automatically.

![Social Autonomies Platform](/public/image.png)

Tweet - [What Can It Do?](https://x.com/defichemist95/status/1932305977031667827)

## Features

- AI-powered tweet generation
- Analytics and performance tracking  
- Automated engagement and replies
- Tweet scheduling
- Subscription management

## Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd twitter-agent-platform
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

## License

MIT - see [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. 