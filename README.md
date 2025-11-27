# EMA Claims Triage System

Event-Driven Multi-Agent Claims Processing Platform with 7 Autonomous AI Agents.

## 🚀 Live Demo
- **Production**: https://ema-project-five.vercel.app

## 🤖 7-Agent Architecture

1. **Agent 1: FNOL Intake** - Voice/text claim intake with multilingual support
2. **Agent 2: Triage Decision** - Complexity analysis, fraud detection, user history
3. **Agent 3: Report & Next-Step** - Claim brief generation + settlement estimates
4. **Agent 4: Document Request** - Evidence collection with feedback loops
5. **Agent 5: Document Evaluation** - Computer vision analysis
6. **Agent 6: Customer Update** - Real-time notifications with TTS
7. **Agent 7: Journey Analytics** - KPI tracking, aggregate reports, improvement hints

## 📊 Key Features

- **Event-Driven Architecture**: All agents communicate via EventBus
- **Settlement Estimates**: $200-$10,000 range based on severity, injuries, fraud
- **Feedback Loops**: Agent 5 mismatches trigger Agent 4 re-requests
- **Agent Attribution**: Every action tracked and displayed in UI
- **Journey Analytics**: Tracks speed, satisfaction, settlement averages
- **Real-time Notifications**: Customer updates with Text-to-Speech

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL + Realtime)
- **AI**: OpenAI GPT-4 + Whisper
- **Deployment**: Vercel

## 📦 Installation

```bash
npm install
npm run dev
```

## 🌐 Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

## 📚 Documentation

- [7-Agent System Guide](/.gemini/antigravity/brain/ef7806da-35c2-4392-a6f1-60efb468d639/7_agent_guide.md)
- [Vercel Deployment Guide](/VERCEL_DEPLOYMENT.md)

## 🎯 Usage

### Customer Flow
1. Click "New Claim" → Choose Voice or Form
2. Submit claim details
3. Receive real-time status updates
4. Upload requested documents

### Company Flow
1. Switch to "Company View"
2. View all claims and agent activity
3. Click any agent in sidebar to see details
4. Review settlement estimates and KPIs

## 📈 Journey Analytics

Agent 7 tracks:
- Avg time to triage
- % Fast-Track vs Flagged
- Avg settlement estimates
- Fraud flag rate
- Agent performance metrics

## 🔒 Security

- API keys secured via Vercel environment variables
- Supabase Row Level Security enabled
- CORS configured for API routes

## 📄 License

MIT

---

Built with ❤️ using Event-Driven Multi-Agent Architecture
