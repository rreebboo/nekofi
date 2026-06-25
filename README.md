# 🐱 Nekofi — AI-Powered Budget Tracker

> A smart, modern personal finance app featuring 100% on-device AI, built with React Native (Expo) and Supabase.

---

## 📦 Tech Stack

| Layer          | Technology                     |
|---------------|--------------------------------|
| **Frontend**  | React Native (Expo SDK 51+)    |
| **Database**  | Supabase PostgreSQL            |
| **Auth**      | Supabase Auth / JWT            |
| **AI**        | On-Device LLM (llama.rn)       |
| **Charts**    | React Native Chart Kit         |
| **Storage**   | Supabase Storage               |

---

## 🗂️ Project Structure

```
nekofi/
├── apps/
│   └── mobile/          → React Native (Expo) app
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
```

### 3. Start Supabase locally

```bash
supabase start
supabase db push
```

### 4. Start mobile app

```bash
cd apps/mobile
npx expo start
```

---

## 📄 License

MIT © 2026 Nekofi Team
