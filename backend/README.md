# LoyaltyApp Backend

FastAPI · PostgreSQL · Redis · Twilio · Docker

---

## Project Structure

```
loyalty-backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── auth.py          # login, token refresh
│   │   ├── businesses.py    # business registration, customer enrollment
│   │   ├── stamps.py        # QR scan → stamp + redeem (core flow)
│   │   ├── cards.py         # public customer card view (no auth)
│   │   ├── admin.py         # platform admin operations
│   │   └── webhooks.py      # Twilio delivery + STOP callbacks
│   ├── core/
│   │   ├── config.py        # all settings via pydantic-settings
│   │   ├── security.py      # JWT, password hashing, QR token signing
│   │   └── dependencies.py  # FastAPI auth dependencies (RBAC)
│   ├── db/
│   │   ├── base.py          # DeclarativeBase + mixins
│   │   └── session.py       # async engine + session factory
│   ├── models/
│   │   └── all_models.py    # all SQLAlchemy ORM models
│   ├── schemas/
│   │   └── all_schemas.py   # all Pydantic request/response schemas
│   ├── services/
│   │   ├── sms_service.py   # Twilio wrapper + message templates
│   │   └── qr_service.py    # QR code generation
│   └── main.py              # app factory, middleware, routers
├── alembic/                 # database migrations
├── scripts/
│   └── bootstrap_admin.py   # create first admin account
├── tests/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Quick Start (Local)

### 1. Clone and configure
```bash
git clone <repo>
cd loyalty-backend
cp .env.example .env
# Edit .env — at minimum set SECRET_KEY, QR_SECRET_KEY, Twilio credentials
```

### 2. Run with Docker Compose
```bash
docker compose up --build
```
API available at: http://localhost:8000
Docs available at: http://localhost:8000/docs

### 3. Bootstrap admin account
```bash
docker compose exec api python scripts/bootstrap_admin.py
```

### 4. Run database migrations (when you change models)
```bash
docker compose exec api alembic revision --autogenerate -m "describe change"
docker compose exec api alembic upgrade head
```

---

## API Overview

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login → access + refresh tokens |
| POST | /api/v1/auth/refresh | Exchange refresh token |

### Business
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/businesses | Public | Register business |
| GET | /api/v1/businesses/me | Business owner | Get own profile |
| PATCH | /api/v1/businesses/me | Business owner | Update settings |
| POST | /api/v1/businesses/me/customers | Business owner | Enroll new customer |
| GET | /api/v1/businesses/me/customers | Business owner | List all customers |
| GET | /api/v1/businesses/me/analytics | Business owner | Usage stats |
| POST | /api/v1/businesses/me/staff | Business owner | Add staff account |

### Stamps (Core Flow)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/stamps | Staff/Owner | Scan QR → add stamp |
| POST | /api/v1/stamps/redeem | Staff/Owner | Redeem completed card |

### Customer Card (Public)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/cards/{qr_token} | Token in URL | View loyalty card |
| GET | /api/v1/cards/{qr_token}/history | Token in URL | Stamp history |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/admin/businesses | Admin | List all businesses |
| PATCH | /api/v1/admin/businesses/{id}/status | Admin | Activate/suspend |
| GET | /api/v1/admin/analytics | Admin | Platform stats |
| GET | /api/v1/admin/sms-logs | Admin | SMS history |

### Webhooks (Twilio)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/webhooks/twilio/status | Delivery status updates |
| POST | /api/v1/webhooks/twilio/inbound | STOP / UNSTOP handling |

---

## Security Notes

- **Passwords**: bcrypt hashed, never stored plain
- **JWT**: HS256, short-lived access tokens (60min) + refresh tokens (30 days)
- **QR tokens**: HMAC-SHA256 signed — impossible to forge without the secret key
- **RBAC**: admin / business_owner / staff roles enforced per endpoint
- **Twilio webhooks**: signature-validated — reject unsigned requests
- **Rate limiting**: 60 req/min global, tighter on stamp endpoint
- **No sequential IDs**: all primary keys are UUIDs — prevents enumeration
- **Security headers**: X-Frame-Options, HSTS (prod), X-Content-Type-Options

---

## Deploy to Railway (Recommended for MVP)

1. Push to GitHub
2. New project → Deploy from GitHub
3. Add environment variables from `.env.example`
4. Add PostgreSQL plugin → Railway sets DATABASE_URL automatically
5. Add Redis plugin → set REDIS_URL
6. Deploy → Railway auto-detects Dockerfile

Cost: ~$5/month on starter plan.
