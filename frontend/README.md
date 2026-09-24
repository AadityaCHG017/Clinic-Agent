# Clinic Appointment Agent - Frontend

A modern, eye-catching, elderly-people-friendly web application for the **Clinic Appointment Agent** backend system. Patients can register, log in, search for doctors, view real-time availability, book/reschedule/cancel appointments, and interact with an intelligent **AI Appointment Assistant** using natural language.

---

## 🌟 Key Features

- **AI Appointment Assistant**: Conversational agent powered by the backend LLM tool-calling engine. Can search doctors, check availability, book, reschedule, or cancel appointments through natural chat interactions.
- **Elderly-Friendly Accessibility Design**:
  - Readable typography (large base font size, line spacing, high contrast).
  - Prominent high-contrast buttons with large touch/click targets (minimum 48px height).
  - Clear visual badges and icon + text indicators for status.
  - Simple, uncluttered navigation for both desktop and mobile screens.
  - Confirmation modals before destructive actions (cancellations).
- **Backend Service Health Check**: Real-time status indicator checking `GET http://localhost:8080/healthz` every 30 seconds.
- **Complete Doctor & Appointment Workflows**:
  - Doctor search with specialty filtering.
  - Interactive doctor availability slot selector grouped by Date and Time of Day (Morning, Afternoon, Evening).
  - Appointments management tabbed view (Upcoming, Past, Cancelled).
  - Rescheduling and Cancellation modals with live backend integration.
- **Secure Authentication**: JWT-based auth state stored securely in local storage with automatic header attachment and login redirect on expiration.

---

## 🏗️ Technology Stack

- **Framework**: [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 5](https://vitejs.dev/)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Vanilla CSS Design System with CSS Custom Properties (`src/index.css`)
- **Typography**: Inter & Nunito Google Fonts

---

## 📂 Project Structure

```
frontend/
├── public/
│   └── favicon.svg           # Application medical favicon
├── src/
│   ├── api/
│   │   ├── client.ts         # Centralized Fetch API client with error handling
│   │   ├── auth.ts           # Login, Register, Me, Change Password endpoints
│   │   ├── doctors.ts        # Doctors list, Doctor detail, Availability endpoints
│   │   ├── appointments.ts   # Appointments CRUD & actions endpoints
│   │   └── agent.ts          # AI Agent Chat endpoint
│   ├── components/
│   │   ├── agent/            # ChatMessage, Tool Call execution display
│   │   ├── appointments/     # AppointmentCard with actions
│   │   ├── doctors/          # DoctorCard
│   │   ├── layout/           # AppLayout (Sidebar, Mobile Nav, Header)
│   │   └── ui/               # StatusBadge, HealthStatus, Modal, LoadingSpinner, EmptyState, ErrorState
│   ├── context/
│   │   └── AuthContext.tsx   # React Authentication Context & Provider
│   ├── hooks/                # Custom React hooks
│   ├── pages/
│   │   ├── Landing.tsx       # Marketing landing page
│   │   ├── Login.tsx         # User authentication login
│   │   ├── Register.tsx      # Elderly-friendly registration form
│   │   ├── Dashboard.tsx     # Patient home dashboard
│   │   ├── Assistant.tsx     # AI Assistant Chat interface (Centerpiece)
│   │   ├── Doctors.tsx       # Doctor search & filter
│   │   ├── DoctorDetails.tsx # Doctor profile & slot booking interface
│   │   ├── Appointments.tsx  # Appointments list with tab navigation
│   │   ├── AppointmentDetails.tsx # Detailed view of a single appointment
│   │   ├── Profile.tsx       # User profile & information
│   │   └── ChangePassword.tsx# Password update page
│   ├── routes/
│   │   └── ProtectedRoute.tsx# Route guard requiring active login
│   ├── types/
│   │   └── index.ts          # Full TypeScript models reflecting Go backend structs
│   ├── utils/
│   │   └── index.ts          # Date formatters, slot helpers, greeting utilities
│   ├── App.tsx               # App router configuration
│   ├── main.tsx              # React entry point
│   └── index.css             # Comprehensive CSS design system & accessibility styles
├── .env                      # Local environment settings
├── .env.example              # Environment variables template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⚙️ Environment Configuration

The frontend relies on the `VITE_API_BASE_URL` environment variable to connect to the Go backend.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Verify `.env` contents:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```

---

## 🚀 Quick Start Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- Running Go Backend on `http://localhost:8080`

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The application will start at:
👉 **`http://localhost:5173`**

---

## 🔗 Backend Requirements & Health Check

The frontend requires the existing **Clinic Appointment Agent** Go backend:
- Backend Base URL: `http://localhost:8080`
- Health Check: `GET http://localhost:8080/healthz`

The system status indicator in the sidebar and dashboard will automatically display **"System Online"** when connected or **"Backend Unavailable"** if the server is offline.

---

## 🤖 AI Assistant Flow & Integration

The central feature of the application is the **AI Appointment Assistant** at `/assistant`:
1. Users submit natural language requests (e.g., *"I need to see a dermatologist tomorrow afternoon"*).
2. Request is dispatched to `POST /api/v1/agent/chat`.
3. The AI agent performs tool calls against backend endpoints (finding doctors, checking availability slots).
4. Tool executions are rendered as step-by-step visual progress badges in the UI.
5. The assistant returns response text along with interactive appointment recommendations.

---

## 🧪 Interactive Demo Walkthrough

1. **Open Application**: Navigate to `http://localhost:5173`.
2. **Register**: Click **Get Started** and create a new patient account.
3. **Dashboard**: View your personalized greeting and service status.
4. **AI Assistant**: Click **Talk to AI Assistant** on the Dashboard or Sidebar.
5. **Ask Assistant**: Select a sample prompt like *"Book a doctor for tomorrow"* or type a natural prompt.
6. **Book Appointment**: Select an available slot directly or via the Doctors directory.
7. **Manage Appointments**: Go to **My Appointments** to view, reschedule, or cancel bookings.

---

## 🛡️ License & Project Notes
Built for the **Clinic Appointment Agent** project integration test & demo. All API contracts strictly map to backend structs without artificial mock data.
