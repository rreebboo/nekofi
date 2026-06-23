# 🐱 Nekofi — AI-Powered Budget Tracker

> A smart, modern personal finance app powered by Gemini AI, built with React Native (Expo), FastAPI, and Supabase.

---

## 📦 Tech Stack

| Layer          | Technology                     |
|---------------|--------------------------------|
| **Frontend**  | React Native (Expo SDK 51+)    |
| **Backend**   | FastAPI (Python 3.11+)         |
| **Database**  | Supabase PostgreSQL            |
| **Auth**      | Supabase Auth / JWT            |
| **AI**        | Google Gemini API              |
| **Charts**    | React Native Chart Kit         |
| **Storage**   | Supabase Storage               |

---

## 🗂️ Project Structure

```
nekofi/
├── apps/
│   ├── mobile/          → React Native (Expo) app
│   └── backend/         → FastAPI REST API
├── packages/
│   └── shared/          → Shared TypeScript types & utilities
├── supabase/            → Migrations, seed, storage policies
├── docs/                → Architecture docs & ADRs
└── docker-compose.yml   → Local dev orchestration
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+, pnpm 9+
- Python 3.11+
- Expo CLI
- Supabase CLI
- Docker (optional)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/mobile/.env.example     apps/mobile/.env
cp apps/backend/.env.example    apps/backend/.env
```

### 3. Start Supabase locally

```bash
supabase start
supabase db push
```

### 4. Start backend

```bash
cd apps/backend
pip install uv && uv sync
uv run uvicorn src.main:app --reload --port 8000
```

### 5. Start mobile app

```bash
cd apps/mobile
npx expo start
```

---

## 📄 License

MIT © 2026 Nekofi Team
