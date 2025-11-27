# Vercel Deployment Guide

## Quick Fix for Current Deployment

Your Vercel deployment isn't working because the backend server (`server.js`) can't run on Vercel's static hosting.

### Solution: Use Vercel Serverless Functions

I've created:
1. `api/openai-proxy.js` - Serverless function for OpenAI API calls
2. `vercel.json` - Vercel configuration
3. Updated `src/services/openai.js` - Uses proxy in production

### Steps to Deploy:

1. **Commit the new files:**
```bash
git add api/ vercel.json src/services/openai.js
git commit -m "feat: Add Vercel serverless functions for deployment"
git push origin main
```

2. **Redeploy on Vercel:**
   - Vercel will auto-deploy from GitHub
   - Or manually: `vercel --prod`

3. **Set Environment Variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase URL
     - `VITE_SUPABASE_KEY` = your Supabase anon key
     - `VITE_OPENAI_API_KEY` = (optional, users can enter their own)

### What Changed:

**Before:**
- Frontend + Backend server (doesn't work on Vercel)

**After:**
- Frontend (Vercel static hosting)
- Backend API (Vercel Serverless Functions in `/api` folder)

### Testing:

Once deployed, the app will:
- Use `/api/openai-proxy` for OpenAI calls in production
- Use `localhost:3001` for development (unchanged)

### Alternative: Deploy Backend Separately

If you prefer to keep `server.js`:
1. Deploy backend to **Railway** or **Render**
2. Update `openai.js` to use that URL in production
3. Keep frontend on Vercel

Let me know which approach you prefer!
