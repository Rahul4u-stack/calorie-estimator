# Deployment Guide — Hosting Your Calorie Estimator for Free

This guide walks you through putting your app on the internet so anyone can use it — completely free.

You will use:
- **Render** to host the Python backend
- **Vercel** to host the React frontend

Total time: about 15–20 minutes.

---

## Before You Start

Make sure:
1. Your code is pushed to a **GitHub repository**
2. You have your **Anthropic API key** ready

### Push to GitHub (if you haven't already)

1. Go to [github.com](https://github.com) and create a free account if needed
2. Click the **+** button → **New repository**
3. Name it `calorie-estimator`, leave it Public, click **Create repository**
4. In your terminal, from inside the `calorie-estimator/` folder, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/calorie-estimator.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

> **Important**: Make sure your `.env` file is in `.gitignore` so your API key is never uploaded to GitHub. The `backend/.env` file should never be committed.

---

## Part 1 — Deploy the Backend on Render

### Step 1 — Create a Render Account

1. Go to [render.com](https://render.com)
2. Click **Get Started for Free**
3. Sign up using your GitHub account (easiest option)

### Step 2 — Create a New Web Service

1. Once logged in, click the **New +** button in the top right
2. Select **Web Service**

### Step 3 — Connect Your GitHub Repo

1. Click **Connect account** next to GitHub (if not already connected)
2. Find your `calorie-estimator` repository in the list
3. Click **Connect**

### Step 4 — Configure the Service

Fill in the settings as follows:

| Setting | Value |
|---|---|
| **Name** | `calorie-estimator-backend` (or any name you like) |
| **Region** | Choose the one closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `python app.py` |
| **Instance Type** | `Free` |

### Step 5 — Add Your API Key

Scroll down to the **Environment Variables** section and click **Add Environment Variable**:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...your-actual-key...` |

Click **Add** to save it.

### Step 6 — Deploy

Click the **Create Web Service** button at the bottom.

Render will now build and deploy your backend. This takes about 2–5 minutes the first time.

### Step 7 — Get Your Backend URL

Once the deployment finishes (you'll see a green **Live** badge), copy your backend URL. It will look like:

```
https://calorie-estimator-backend.onrender.com
```

**Save this URL — you will need it in Part 2.**

> **Note**: Free Render services "spin down" after 15 minutes of inactivity. The first request after inactivity may take 30–60 seconds to respond. This is normal for free hosting.

---

## Part 2 — Deploy the Frontend on Vercel

### Step 1 — Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up**
3. Choose **Continue with GitHub** — this is the easiest option

### Step 2 — Import Your Repository

1. Once logged in, you will see the dashboard. Click **Add New...** → **Project**
2. Find your `calorie-estimator` repository and click **Import**

### Step 3 — Configure the Project

On the configuration screen:

1. **Framework Preset**: Vercel should automatically detect **Vite**. If not, select it manually.
2. **Root Directory**: Click **Edit** next to Root Directory and type `frontend`
3. Leave all other settings as their defaults

### Step 4 — Add the Backend URL as an Environment Variable

Still on the configuration screen, expand the **Environment Variables** section:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://calorie-estimator-backend.onrender.com` |

Replace the value with the actual URL you copied from Render in Part 1.

Click **Add** to save it.

### Step 5 — Deploy

Click the **Deploy** button.

Vercel will build your frontend. This takes about 1–2 minutes.

### Step 6 — Open Your Live App

When the deployment finishes, Vercel will show you a URL like:

```
https://calorie-estimator.vercel.app
```

Click it — your app is now live on the internet!

---

## Updating Your App Later

Whenever you push new code to GitHub, both services will automatically redeploy:
- **Render** will rebuild and restart the backend
- **Vercel** will rebuild and redeploy the frontend

No manual steps needed after the initial setup.

---

## Troubleshooting Deployment

**Backend shows "Build failed" on Render**
- Check that the Root Directory is set to `backend`
- Make sure `requirements.txt` exists in the `backend/` folder

**Frontend shows a blank page or "Network Error"**
- Check that `VITE_API_URL` in Vercel matches your Render URL exactly (no trailing slash)
- Check the browser console (F12 → Console) for error messages

**"Invalid API Key" error in production**
- Go to your Render service → Environment → verify `ANTHROPIC_API_KEY` is set correctly
- After updating env vars in Render, click **Manual Deploy** to redeploy

**CORS errors in the browser console**
- This means the backend isn't allowing requests from the frontend URL
- Make sure your `app.py` has CORS configured to allow your Vercel domain

---

## Cost Summary

| Service | Plan | Cost |
|---|---|---|
| Render (backend) | Free | $0/month |
| Vercel (frontend) | Hobby | $0/month |
| Anthropic API | Pay per use | ~$0.01 per photo |

You only pay for Claude API calls — roughly 1 cent per food photo analyzed.
