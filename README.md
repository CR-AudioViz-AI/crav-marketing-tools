# 🚀 Marketing Command Center

**AI-Powered Marketing Strategy Generator | 100+ FREE Platforms | Launch Checklists**

Part of the CR AudioViz AI ecosystem - *Your Story. Our Design.*

---

## ✨ Features

### 🎯 AI Strategy Generator
- Generate custom marketing strategies in seconds
- Prioritizes FREE solutions before paid alternatives
- Multi-AI routing (Groq → Perplexity → OpenAI)
- Industry-specific recommendations
- Cross-sell javari tools where applicable

### 🌍 Platform Finder
- 100+ marketing platforms organized by category
- **FREE → Budget → Premium** hierarchy (always shows free first)
- Categories: Social, Email, SEO, Content, Local, Community, Video
- Integrated javari tool alternatives
- Filter by tier, category, and budget

### 🚀 Launch Checklist
- 15+ FREE launch platforms (Product Hunt, Hacker News, Reddit, etc.)
- Pre-launch, launch day, and post-launch task tracking
- Platform-specific tips and best practices
- Conversion rate and audience size data

### 📊 Area Targeting (Pro)
- ZIP code demographic data from US Census Bureau
- Marketing insights based on demographics
- Audience profiling and channel recommendations

### 📈 Trends & Research
- Real-time data from Reddit, Hacker News, News API
- Market sentiment analysis
- Competitive intelligence integration

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **AI Providers:** Groq (free), Perplexity, OpenAI
- **Icons:** Lucide React
- **Deployment:** Vercel

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/CR-AudioViz-AI/javari-marketing-tools.git
cd javari-marketing-tools

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🔑 Environment Variables

```env
# Required: Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers (at least one required)
GROQ_API_KEY=          # FREE tier available
PERPLEXITY_API_KEY=    # FREE tier available
OPENAI_API_KEY=        # Paid

# Optional enhancements
NEWS_API_KEY=          # 100 req/day free
IPINFO_TOKEN=          # 50K req/month free
```

---

## 📁 Project Structure

```
javari-marketing-tools/
├── src/
│   └── app/
│       ├── api/
│       │   ├── strategy/      # AI strategy generation
│       │   ├── platforms/     # Platform finder
│       │   ├── launch/        # Launch checklist
│       │   ├── census/        # Demographics API
│       │   ├── trends/        # Market research
│       │   └── cross-sell/    # Product recommendations
│       ├── pricing/           # Pricing page
│       ├── page.tsx           # Main dashboard
│       ├── layout.tsx         # App layout
│       └── globals.css        # Styles
├── config/
│   ├── platforms.ts           # 100+ platforms database
│   └── pricing.ts             # Pricing tiers & goals
├── lib/
│   ├── ai-strategy.ts         # AI generation logic
│   ├── free-apis.ts           # Census, Reddit, HN, News
│   └── supabase.ts            # Database client
└── types/
    └── index.ts               # TypeScript definitions
```

---

## 💰 Pricing Tiers

| Feature | Starter (FREE) | Pro ($19/mo) | Enterprise |
|---------|---------------|--------------|------------|
| AI Strategies | 3/month | 50/month | Unlimited |
| Platforms Directory | ✅ | ✅ | ✅ |
| Launch Checklists | 1 | Unlimited | Unlimited |
| Area Targeting | State | ZIP Code | Custom |
| Census Data | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |
| White-label | ❌ | ❌ | ✅ |

---

## 🔌 API Endpoints

### POST /api/strategy
Generate AI marketing strategy

```json
{
  "businessType": "SaaS startup",
  "focus": "launch",
  "budget": 0,
  "timeline": "3 months",
  "platforms": ["social", "email"],
  "area": { "level": "national", "value": "US", "name": "United States" }
}
```

### GET /api/platforms
Find marketing platforms

```
/api/platforms?category=social&tier=free&freeOnly=true
```

### GET /api/census
Get demographic data (Pro)

```
/api/census?zip=33901
```

### GET /api/launch
Get launch platforms directory

### GET /api/trends
Get market research

```
/api/trends?topic=ai+startups&source=all
```

---

## 🆓 FREE APIs Used

| API | Rate Limit | Purpose |
|-----|------------|---------|
| US Census Bureau | Unlimited | Demographics |
| Reddit | 100 req/min | Community trends |
| Hacker News | Unlimited | Tech trends |
| Google Trends* | Via Perplexity | Search trends |
| Groq | Generous free | AI generation |
| Perplexity | Free tier | Research |

---

## 🔗 Cross-sell Integration

Every marketing recommendation includes relevant javari tool suggestions:

- **Social Strategy** → javari Social Graphics
- **Email Campaigns** → javari Newsletter
- **Competitor Analysis** → javari Competitive Intelligence
- **Brand/Logo** → javari Logo Studio
- **AI Assistance** → Javari AI

---

## 🚀 Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CR-AudioViz-AI/javari-marketing-tools)

Or manually:

```bash
npm run build
vercel --prod
```

---

## 📝 License

Proprietary - CR AudioViz AI, LLC

---

## 🤝 Support

- Website: [craudiovizai.com](https://craudiovizai.com)
- Email: support@craudiovizai.com

---

**Built with ❤️ by CR AudioViz AI**

*Everyone connects. Everyone wins.*

<!-- Last deployed: 2025-12-31 10:14:14 EST -->

<!-- build-trigger 2026-05-19 02:10 UTC -->
