# 🛡️ PayrollGuard (OpenTrust HR)

**PayrollGuard** is an advanced, secure HR and payroll management system focused on **preventing insider threats and account takeovers**. It provides real-time behavioral risk scoring, anomaly detection, and a multi-tiered approval system to ensure that sensitive employee data (such as bank routing strings and personal details) can never be manipulated silently.

---

## 🚀 Key Features

- **🧠 Real-Time Risk Engine**: Analyzes login attempts and IP/device changes to dynamically assign a risk score (0-100) to every user session. High-risk sessions (70+) are immediately flagged and blocked.
- **🛡️ Multi-Tier Approvals (Maker-Checker)**: Any modification to critical employee data (like Bank Account information) requires an explicit review and approval from a designated Manager or Admin.
- **🔗 Cryptographic Audit Trails**: All login events, risk flags, and profile changes are permanently logged on a sequentially hashed audit chain (`prevHash -> currentHash`), ensuring the system's history is tamper-evident and impossible to falsify after the fact.
- **📱 Step-Up OTP Authentication**: Triggered when a medium-risk login or sensitive configuration change is attempted, utilizing email-based one-time passcodes.
- **⚡ Admin & Manager Command Centers**: Dedicated dashboards for security monitoring, featuring live attack surge simulations, risk distribution charts, and direct links to verify audit hash integrity on the fly.

## 🛠 Tech Stack

- **Frontend**: React (Vite), React Router, Vanilla CSS Modules
- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose
- **Security & Crypto**: `crypto` (SHA-256 for audit chaining), `bcryptjs` (password hashing), `jsonwebtoken` (JWTs)

## 📦 Project Structure

```text
├── backend/
│   ├── config/          # DB connection & environment
│   ├── controllers/     # API logic (Auth, Audit, Risk, Payroll)
│   ├── models/          # Mongoose Schemas (Alert, AuditEvent, Employee...)
│   ├── routes/          # Express route definitions
│   └── services/        # Auxiliary services (Email/OTP, Risk Scoring)
└── frontend/
    ├── public/
    └── src/
        ├── api/         # Axios interceptors config
        ├── components/  # Loaders, Navbars, Reusable UI
        ├── context/     # Auth Context for managing active sessions
        └── pages/       # Dashboards (Admin, Manager, Employee, etc.)
```

## ⚙️ Local Development Setup

### 1. Requirements
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or via Atlas)

### 2. Environment Variables (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/opentrust_hr
JWT_SECRET=super_secret_jwt_key_that_should_be_long
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.sandbox.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
MAIL_FROM=security@payrollguard.local
```
*(Note: Use a service like Mailtrap to safely test the OTP and Step-Up authentication emails locally!)*

### 3. Installation & Running

Open two terminal windows/tabs:

**Terminal 1 (Backend):**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

### 4. Admin Seeding (First-time setup)
When the backend runs against an empty database, it will automatically bootstrap a default Admin account:
- **Email**: `admin@opentrust.com`
- **Password**: `admin123`

Log in using these credentials to begin verifying change requests, utilizing the command center, and running simulated risk surge attacks.

## 🧪 Testing the Security Engine

1. **Dashboard Overview:** Log into your Admin account to view the Command Center.
2. **Surge Simulator:** Click **"Simulate Attack Surge"** to inject 50 high-risk, unverified login attempts into the system. Watch the real-time Risk Distribution metrics react instantly.
3. **Change Requests:** Log in as an Employee, attempt to change your Bank Account details. Log back in as a Manager to see the `PENDING` request block the data update until approved.
4. **Audit Verification:** Visit the Audit Trail Lookup, type an Employee ID, and click **"Verify Hash Chain"**. The system will mathematically rebuild the entire user timeline to prove zero database tampering has occurred.
