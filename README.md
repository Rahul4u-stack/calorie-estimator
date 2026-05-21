# Calorie Estimator

A web app that uses AI (Claude Vision) to estimate the calories in your food — just take a photo!

Upload or snap a picture of your meal and get an instant calorie breakdown powered by Anthropic's Claude Vision API.

---

## Project Overview

- **Frontend**: React + Vite (runs on port 5173)
- **Backend**: Python Flask (runs on port 5000)
- **AI**: Claude Vision API (claude-sonnet-4-6) — analyzes food photos and returns calorie estimates

---

## Prerequisites

Before you begin, make sure you have the following installed on your computer:

1. **Node.js** (v18 or higher) — [Download here](https://nodejs.org/)
   - To check if you have it: `node --version`
2. **Python 3.9 or higher** — [Download here](https://www.python.org/downloads/)
   - To check if you have it: `python3 --version`
3. **An Anthropic API Key** — [Get one here](https://console.anthropic.com/)
   - Sign up, go to "API Keys", and create a new key
   - Keep it safe — you will need it in the setup steps below

---

## Local Setup

### Step 1 — Get the Code

If you cloned this from GitHub:

```bash
git clone https://github.com/YOUR_USERNAME/calorie-estimator.git
cd calorie-estimator
```

### Step 2 — Set Up the Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Now open the `.env` file in any text editor and replace `your_api_key_here` with your actual Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...your-real-key-here...
```

Save the file.

### Step 3 — Set Up the Frontend

Open a **new terminal window**, then:

```bash
cd frontend
npm install
```

---

## Running Locally

You need **two terminal windows** open at the same time — one for the backend and one for the frontend.

### Terminal 1 — Start the Backend

```bash
cd backend
python app.py
```

You should see something like:
```
 * Running on http://127.0.0.1:5000
```

### Terminal 2 — Start the Frontend

```bash
cd frontend
npm run dev
```

You should see something like:
```
  VITE v5.x.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```

### Open the App

Open your browser and go to: [http://localhost:5173](http://localhost:5173)

Upload a photo of food and click "Estimate Calories" — that's it!

---

## Project Structure

```
calorie-estimator/
├── backend/           # Python Flask API
│   ├── app.py         # Main server file
│   ├── requirements.txt
│   ├── .env           # Your secrets (never commit this!)
│   └── .env.example   # Template showing what vars are needed
├── frontend/          # React + Vite app
│   ├── src/
│   ├── public/
│   └── package.json
├── README.md          # This file
└── DEPLOYMENT.md      # How to host this online for free
```

---

## Hosting Online (Free)

Want to put this on the internet so anyone can use it? See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions using:
- **Render** (free backend hosting)
- **Vercel** (free frontend hosting)

---

## Troubleshooting

**"Module not found" or import errors (Python)**
- Make sure you ran `pip install -r requirements.txt` inside the `backend/` folder
- Try `pip3` instead of `pip` if the command isn't found

**"npm: command not found"**
- Node.js is not installed. Download it from [nodejs.org](https://nodejs.org/)

**"Invalid API Key" error**
- Double-check your `.env` file — the key should start with `sk-ant-`
- Make sure there are no extra spaces around the `=` sign

**Frontend can't reach the backend**
- Make sure both terminals are running
- Backend must be on port 5000 and frontend on port 5173
