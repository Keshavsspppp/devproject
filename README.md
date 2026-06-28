# DevCollab

DevCollab is a MERN-based real-time code review platform. It combines pull-request style review screens, live collaborative sessions, async discussion threads, authentication, role-based access, and a mockable AI review assistant.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, Vite, React Router, Zustand, Axios, Socket.io client |
| Backend | Node.js, Express, Socket.io, Mongoose, JWT auth, Argon2 |
| Database | MongoDB, with in-memory demo fallback |
| Optional services | Redis for multi-instance sockets, GitHub OAuth/webhooks, Gemini or Groq AI providers |

## Project Structure

```text
devcollab/
  README.md
  client/
    index.html
    package.json
    vite.config.js
    src/
      api/
      components/
      hooks/
      pages/
      store/
      App.jsx
      main.jsx
  server/
    .env.example
    package.json
    src/
      config/
      db/
      middleware/
      models/
      routes/
      services/
      sockets/
      utils/
      server.js
```

The app is intentionally split into two independent folders:

- `client/` runs the React frontend on `http://localhost:5173`.
- `server/` runs the Express API and Socket.io backend on `http://localhost:4001`.

## Features

- User registration, login, logout, refresh-token rotation, and `HttpOnly` auth cookies.
- Demo login with seeded data: org, users, repo, pull request, review session, and diff.
- Organization, repository, session, and discussion-thread APIs.
- Live review sessions with Socket.io presence, cursor movement, typing, comments, and reactions.
- GitHub integration hooks for OAuth, PR data, and webhooks.
- AI review endpoint with mock, Gemini, or Groq provider support.
- MongoDB persistence with demo-mode fallback to an in-memory store when Mongo is unavailable.

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB local or MongoDB Atlas, unless you use demo fallback mode

## Setup

Install backend dependencies:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\server
npm install
```

Install frontend dependencies:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\client
npm install
```

Create the backend environment file:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\server
copy .env.example .env
```

Edit `server/.env` as needed.

Recommended local values:

```ini
NODE_ENV=development
PORT=4001
CLIENT_ORIGIN=http://localhost:5173
DEMO_MODE=true
MONGO_URI=mongodb://127.0.0.1:27017/devcollab
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
AI_PROVIDER=mock
```

Do not commit `server/.env`; it contains secrets and is ignored by git.

## Running Locally

Start the backend:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\server
npm run dev
```

Start the frontend in another terminal:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\client
npm run dev
```

Open the app:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:4001/api/health
```

The frontend Vite proxy forwards `/api` and `/socket.io` requests to `http://localhost:4001`.

## Seed Demo Data

Seed MongoDB with demo data:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\server
npm run seed
```

Demo login:

```text
Email: demo@devcollab.dev
Password: demo1234
```

If MongoDB cannot be reached and `DEMO_MODE=true`, the server falls back to the in-memory store. In-memory data is useful for quick demos but does not persist after restart.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode, usually `development` or `production` |
| `PORT` | Backend port, currently expected as `4001` by the frontend proxy |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS and Socket.io |
| `DEMO_MODE` | Enables in-memory fallback when Mongo is unavailable |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_ACCESS_TTL` | Access-token lifetime |
| `JWT_REFRESH_TTL` | Refresh-token lifetime |
| `COOKIE_SECURE` | Set `true` when serving cookies over HTTPS |
| `GITHUB_CLIENT_ID` | Optional GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Optional GitHub OAuth client secret |
| `GITHUB_WEBHOOK_SECRET` | Optional GitHub webhook secret |
| `AI_PROVIDER` | `mock`, `gemini`, or `groq` |
| `GEMINI_API_KEY` | Gemini API key when using `AI_PROVIDER=gemini` |
| `GROQ_API_KEY` | Groq API key when using `AI_PROVIDER=groq` |
| `REDIS_URL` | Optional Redis URL for multi-instance socket scaling |

## Scripts

Backend scripts from `server/`:

```cmd
npm run dev      # start backend with node --watch
npm run start    # start backend without watch mode
npm run seed     # seed demo data
```

Frontend scripts from `client/`:

```cmd
npm run dev      # start Vite dev server
npm run build    # create production build
npm run preview  # preview production build
```

## API Overview

All API routes are mounted under `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Login and set auth cookies |
| `POST` | `/auth/demo` | Login as the seeded demo user |
| `POST` | `/auth/logout` | Logout and clear cookies |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `GET` | `/auth/me` | Return the current user |
| `GET`, `POST` | `/orgs` | List or create organizations |
| `GET`, `POST` | `/repos` | List or create repositories |
| `GET`, `POST` | `/sessions` | List or create review sessions |
| `GET`, `POST` | `/threads` | List or create discussion threads |
| `POST` | `/ai/review` | Stream AI review suggestions |
| `GET` | `/github/status` | Check GitHub integration status |
| `GET` | `/github/connect` | Start GitHub OAuth flow |
| `POST` | `/github/webhook` | Receive GitHub webhook events |

## WebSocket Events

Socket.io is served at `/socket.io` with a `/sessions` namespace.

Common events:

- `session:join`
- `session:leave`
- `cursor:move`
- `typing:start`
- `typing:stop`
- `comment:add`
- `comment:update`
- `reaction:add`
- `presence`
- `github:pull_request`

## Troubleshooting

If the backend says the port is already in use:

```cmd
netstat -ano | findstr :4001
taskkill /PID <PID_FROM_NETSTAT> /F
```

If login fails for the demo account, seed the database again:

```cmd
cd C:\Users\thebo\Desktop\project\devcollab\server
npm run seed
```

If you change the backend port, update both:

- `PORT` in `server/.env`
- proxy targets in `client/vite.config.js`

## Git Notes

Ignored local files include:

- `.agents/`
- `.codex/`
- `START_COMMANDS.md`
- `node_modules/`
- `client/dist/`
- `server/.env`

Keep secrets in `server/.env`, not in committed files.
