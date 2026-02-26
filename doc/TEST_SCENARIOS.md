# PayrollGuard - Test Scenarios

## 📋 Test Account Credentials

### Account 1: Legitimate Employee
- **Email**: john.doe@company.com
- **Password**: SecurePass123!
- **Name**: John Doe
- **Role**: employee
- **Bank**: 
  - Routing: 021000021 (JPMorgan)
  - Account: 1234567890
- **Address**: New York, NY, US

### Account 2: Manager
- **Email**: manager.jane@company.com
- **Password**: ManagerPass456!
- **Name**: Jane Smith
- **Role**: manager
- **Location**: New York, NY, US

### Account 3: Admin/Security Staff
- **Email**: admin.security@company.com
- **Password**: AdminPass789!
- **Name**: Security Team
- **Role**: admin
- **Location**: New York, NY, US

---

## 🎯 Scenario 1: Legitimate Bank Change (Low Risk)

**User**: John Doe (Employee)
**Action**: Change bank account from known IP/device
**Expected Flow**: AUTO_APPROVE ✅

**Steps**:
1. Login as John from home (same IP/device as always)
2. Go to Account Settings
3. Update bank account
4. Risk Score: ~15 (known IP + known device + normal hour)
5. Result: Automatically approved

---

## 🚨 Scenario 2: Suspicious Change (Medium Risk)

**User**: John Doe (Employee)
**Action**: Change bank account from new IP + new device at 2am
**Expected Flow**: OTP_REQUIRED 📧

**Steps**:
1. Login as John from VPN (new IP)
2. Using different device (new device ID)
3. Time: 2am (unusual hour)
4. Update bank account
5. Risk Score Breakdown:
   - Unknown IP: +30
   - Unknown Device: +30
   - Unusual Hour: +20
   - Total: 80 → MANAGER_REQUIRED ⚠️
6. Manager Jane reviews & approves/rejects

---

## 🔴 Scenario 3: Fraud Attempt (High Risk)

**Attacker**: Compromised credentials
**Action**: Multiple rapid bank changes + VPN + burst activity
**Expected Flow**: BLOCKED 🛑

**Risk Signals Triggered**:
- UNKNOWN_IP (+30): From different country
- VPN_DETECTED (+35): Using proxy
- BURST_ACTIVITY (+40): 5+ attempts in 10 min
- UNUSUAL_HOUR (+20): 3am attempt
- GEOGRAPHIC_MISMATCH (+40): IP from UK, employee in NY
- **Total Risk Score**: 165 → Capped at 100

**Gemini AI Analysis**: 
- Detects: Money mule pattern + velocity abuse
- Recommendation: BLOCK
- Result: Account FROZEN 🔐

---

## 📡 API Endpoints to Test

### 1. Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@company.com",
  "password": "SecurePass123!"
}
```

### 2. Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@company.com",
  "password": "SecurePass123!"
}
```

### 3. Risk Check (Bank Change)
```bash
POST /api/risk-check
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "device-001",
  "newBankDetails": {
    "accountNumber": "9876543210",
    "routingNumber": "021000021"
  },
  "behavior": {
    "clipboardPaste": false,
    "directNavigation": false,
    "sessionDurationSeconds": 300
  }
}
```

### 4. Verify OTP
```bash
POST /api/risk-check/verify-otp
Authorization: Bearer <token>
Content-Type: application/json

{
  "changeRequestId": "<id>",
  "otp": "123456"
}
```

### 5. Manager Review
```bash
GET /api/manager/pending-approvals
Authorization: Bearer <manager-token>
```

### 6. Approve/Reject
```bash
PUT /api/manager/approvals/<changeRequestId>
Authorization: Bearer <manager-token>
Content-Type: application/json

{
  "status": "APPROVED" // or "REJECTED"
}
```

### 7. Admin Dashboard
```bash
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

---

## 🧪 cURL Test Commands

### Register John (Employee)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@company.com",
    "password": "SecurePass123!"
  }'
```

### Login John
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john.doe@company.com",
    "password": "SecurePass123!"
  }'
```

### Test Risk Check (Medium Risk)
```bash
curl -X POST http://localhost:5000/api/risk-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-device-id: new-laptop-001" \
  -d '{
    "deviceId": "new-laptop-001",
    "newBankDetails": {
      "accountNumber": "9876543210",
      "routingNumber": "021000021"
    }
  }'
```

---

## ✅ Expected Results

| Scenario | Risk Score | Path | Status |
|----------|-----------|------|--------|
| Legit Change | 15 | AUTO_APPROVE | ✅ Auto approved |
| New Device/IP | 80 | MANAGER_REQUIRED | ⏳ Awaiting manager |
| High Risk | 100 | BLOCK | 🛑 Frozen |

---

## 🔧 Running Tests

1. **Start Backend**:
   ```bash
   cd backend && npm run dev
   ```

2. **Register Accounts** (using curl commands above)

3. **Create Risk Events**:
   ```bash
   cd backend && node scripts/seedAttacks.js
   ```

4. **Check Admin Dashboard**: `http://localhost:5173/admin-dashboard`

5. **Manager Reviews**: `http://localhost:5173/manager-portal`
