# The 3rd Annual Herbtown Classic

Live-syncing scorecard for a 3-person golf trip at Big Cedar Lodge. Handles match play (2v1 rotating every 6 holes), stroke play (handicap-adjusted, triple bogey max), and snakes.

## Setup

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step deployment instructions.

## Tech stack

- **React 18** + Vite
- **Firebase Realtime Database** for live sync
- Deployed on Vercel

## Local development

```bash
npm install
# Create a .env.local file with your Firebase values (see DEPLOY.md)
npm run dev
```
