# Shared Expenses App

A modern, full-stack application to manage shared expenses, handling complex split types and dirty data imports seamlessly.

## Tech Stack
- **Frontend**: React + Vite + TailwindCSS (Optional but standard for modern UI)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL

## Deployment Instructions

### Backend (Render)
1. Push the code to GitHub.
2. In Render, create a new "Web Service".
3. Connect your repository and set the Root Directory to `backend`.
4. Build Command: `npm install`
5. Start Command: `node index.js`
6. Add Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `NODE_ENV`: `production`

### Frontend (Vercel)
1. In Vercel, create a new Project.
2. Connect your repository and set the Root Directory to `frontend`.
3. Framework Preset: Vite.
4. Add Environment Variables:
   - `VITE_API_URL`: The URL of your deployed backend (e.g., `https://your-backend.onrender.com/api`).
5. Deploy.

## Setup Locally

### Backend
```bash
cd backend
npm install

npm run dev
```

### Frontend
```bash
cd frontend
npm install

npm run dev
```
