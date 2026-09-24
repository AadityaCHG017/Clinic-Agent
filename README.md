# 🏥 Clinic Appointment Agent

A production-ready, full-stack **AI-powered Clinic Appointment System** built with **Go (Gin)** + **React (Vite)** + **PostgreSQL** + **Google Gemini LLM**.

Elderly patients can register, log in, and interact with a conversational AI assistant to book, reschedule, or cancel doctor appointments entirely through natural language — no manual form-filling required.

---

## ✨ Features

- **Conversational AI Agent** — Book, cancel, or reschedule appointments by just typing naturally (e.g. *"I want to see a cardiologist on Friday"*).
- **7-Day Booking Window** — Browse and book doctor availability up to 7 days ahead.
- **Appointment Reminders** — Persistent reminder banner showing upcoming appointments.
- **Chat History Persistence** — AI conversation is saved across page refreshes via `localStorage`.
- **Secure Auth** — JWT-based authentication with Argon2id password hashing.
- **Double-Booking Prevention** — PostgreSQL row-level locking with unique partial indexes.
- **Rate Limiting** — Sliding token-bucket limiters on auth and agent endpoints.
- **IDOR Protection** — All resources enforced at the DB query level (`WHERE patient_id = $auth_id`).
- **Elderly-Friendly UI** — Large fonts, high-contrast colours, big touch targets, clear confirmations.

---

## 🏛️ Architecture

```
Patient Browser  ──HTTP──▶  React/Vite Frontend
                                    │  VITE_API_BASE_URL
                                    ▼
                           Go / Gin REST API  (:8080)
                                    │
                       ┌────────────┼────────────┐
                       ▼            ▼             ▼
                  Auth Service  AI Agent    Doctors &
                  (JWT/Argon2)  (Gemini)   Appointments
                                    │
                                    ▼
                              PostgreSQL DB
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Go 1.22+, Gin, `pgx` v5 |
| **Database** | PostgreSQL 14+ |
| **AI / LLM** | Google Gemini (`gemini-2.5-flash`) |
| **Frontend** | React 18, Vite 5, TypeScript, React Router v6 |
| **Styling** | Vanilla CSS Design System (no Tailwind) |
| **Icons** | Lucide React |
| **Fonts** | Inter & Nunito (Google Fonts) |

---

## 🔒 Security

1. **LLM never touches SQL directly** — all tool calls go through the Go service layer.
2. **Identity injection** — JWT patient ID is injected server-side; the LLM cannot spoof it.
3. **IDOR protection** — every DB query includes `AND patient_id = $auth_id`.
4. **Double-booking** — `FOR UPDATE` row locks + unique partial indexes.
5. **Password hashing** — Argon2id (Go stdlib).
6. **Rate limiting** — auth and agent endpoints are rate-limited.
7. **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `CSP`.

---

## 🛠️ Prerequisites

- **Go** v1.22+
- **Node.js** v18+
- **PostgreSQL** v14+
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey)

---

## 🚀 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/clinic-agent.git
cd clinic-agent
```

### 2. Set up the database

```bash
createdb clinic_db
```

### 3. Configure the backend

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=8080
DATABASE_URL=postgres://postgres@127.0.0.1:5432/clinic_db?sslmode=disable
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRATION_MINUTES=30
LLM_API_KEY=your-gemini-api-key-here
LLM_MODEL=gemini-2.5-flash
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

> **Never commit `.env` — it is in `.gitignore`.**

### 4. Run the backend

Migrations run automatically on startup:

```bash
go run cmd/api/main.go
```

Backend starts at: **`http://localhost:8080`**
Health check: **`GET http://localhost:8080/healthz`**

### 5. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

The default `frontend/.env` works out of the box for local dev:

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 6. Run the frontend

```bash
npm install
npm run dev
```

Frontend starts at: **`http://localhost:5173`**

---

## ☁️ Production Deployment

### Backend (Railway, Render, Fly.io, etc.)

Set the following environment variables in your hosting provider's dashboard:

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (usually auto-set by provider) |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `JWT_SECRET` | Long random string — generate with `openssl rand -hex 32` |
| `JWT_EXPIRATION_MINUTES` | Token lifetime in minutes (e.g. `60`) |
| `LLM_API_KEY` | Your Google Gemini API key |
| `LLM_MODEL` | `gemini-2.5-flash` |
| `CORS_ALLOWED_ORIGIN` | Your deployed frontend URL, e.g. `https://clinic-app.vercel.app` |

Build command:
```bash
go build -o clinic-agent ./cmd/api/main.go
```

Start command:
```bash
./clinic-agent
```

### Frontend (Vercel, Netlify, etc.)

Set the following environment variable in your hosting provider:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Your deployed backend URL, e.g. `https://clinic-api.railway.app` |

Build settings:
- **Root directory**: `frontend`
- **Build command**: `npm run build`
- **Output directory**: `dist`

---

## 📑 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | Register new patient |
| `POST` | `/api/v1/auth/login` | No | Login, returns JWT |
| `GET` | `/api/v1/auth/me` | JWT | Current user profile |
| `POST` | `/api/v1/auth/change-password` | JWT | Change password |

### Doctors & Availability
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/doctors` | No | List doctors (filter: `?specialization=`) |
| `GET` | `/api/v1/doctors/:id` | No | Doctor details |
| `GET` | `/api/v1/doctors/:id/availability?date=YYYY-MM-DD` | No | Available 30-min slots |

### Appointments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/patients/me/appointments` | JWT | List patient's appointments |
| `POST` | `/api/v1/appointments` | JWT | Book appointment |
| `GET` | `/api/v1/appointments/:id` | JWT | Appointment details |
| `PATCH` | `/api/v1/appointments/:id/reschedule` | JWT | Reschedule |
| `POST` | `/api/v1/appointments/:id/cancel` | JWT | Cancel |

### AI Agent
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/agent/chat` | JWT | Natural language assistant |

Example payload:
```json
{ "message": "Book me an appointment with a cardiologist next Monday" }
```

---

## 🧪 Running Tests

```bash
go test ./... -v
```

---

## 📂 Project Structure

```
clinic-agent/
├── cmd/api/main.go             # Application entry point
├── internal/
│   ├── agent/                  # LLM agent: tools, executor, intent engine
│   ├── appointments/           # Appointment service & repository
│   ├── auth/                   # JWT, password hashing, middleware
│   ├── config/                 # Environment variable loading
│   ├── doctors/                # Doctor service & repository
│   └── server/                 # Gin router & middleware setup
├── migrations/                 # SQL migration files (auto-run on startup)
├── frontend/                   # React/Vite frontend application
│   ├── src/
│   │   ├── api/                # API client & endpoint wrappers
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # React Auth context
│   │   ├── pages/              # Application pages/screens
│   │   └── types/              # TypeScript type definitions
│   ├── .env.example            # Frontend env template
│   └── vite.config.ts
├── .env.example                # Backend env template
├── .gitignore
└── README.md
```

---

## 📄 License

MIT License — built as a demonstration project for AI-powered healthcare appointment coordination.
