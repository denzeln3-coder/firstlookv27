# FirstLook

TikTok-style startup discovery platform. Founders record 15-second pitches and 2-minute demos for investors and early adopters to discover.

## Tech Stack
- React + Vite
- Supabase (database, auth, storage)
- Tailwind CSS

## Features
- Video pitch recording (15s pitch, 2min demo)
- Explore feed with upvoting
- Founder profiles with tabs (Pitches, Demo, Updates, About)
- Follow founders
- Collab Mode (Looking for co-founder, designer, etc.)
- Community channels and meetups

## Run locally
```bash
npm install
npm run dev
```

## Environment Variables
Create a `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
