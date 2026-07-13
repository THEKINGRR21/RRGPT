# RRGpt — Precision Conversational AI Workspace

RRGpt is an enterprise-grade, swappable-LLM conversational workspace designed for developers and professionals. It is engineered with a Claude-inspired luxury aesthetic, supporting dynamic text streams, Markdown/LaTeX typesetting, vector-similarity RAG document indexing, local security guardrails, memory summarization, and live admin diagnostics.

---

## 🏗️ Architectural Blueprint

- **Core Framework**: Next.js (App Router, Turbopack, Tailwind CSS).
- **LLM Routing Gateway**: Vercel AI SDK (unified swappable wrappers supporting Google Gemini, OpenAI, and Ollama Local).
- **Database & Vectors**: PostgreSQL (pgvector extension enabled) connected via Drizzle ORM with connection pooling support.
- **Security & Session Authentication**: Auth.js (NextAuth v5) supporting Nodemailer magic links, Google OAuth, and developer bypass logins.
- **RAG Ingestion**: Sliding-window recursive parser targeting **768** dimensions across all embedding space models (normalized text-embedding-3-small, text-embedding-004, nomic-embed-text).
- **Diagnostics**: Custom in-memory rate limiter (sliding window) and SVG usage dashboard.

---

## ⚙️ Environment Variables Guide

Create a `.env` file in the root directory:

```env
# 1. Database Connection (pgvector container bound to 5435)
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/rrgpt"

# 2. NextAuth Secret & Host Configuration
NEXTAUTH_SECRET="your-super-secret-auth-key-here"
NEXTAUTH_URL="http://localhost:3000"

# 3. Swappable LLM Provider API Credentials
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"

# 4. Local Offline Model Settings (Ollama)
OLLAMA_BASE_URL="http://localhost:11434/v1"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
```

---

## 🛠️ Getting Started & Database Setup

### 1. Boot up the pgvector Database
Spin up the Docker PostgreSQL instance pre-loaded with `pgvector`:
```bash
docker-compose up -d
```

### 2. Generate and Apply Migrations
Synchronize Drizzle schemas and apply constraints:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```
*(Note: Migrations manually inject `CREATE EXTENSION IF NOT EXISTS vector;` at the top of the generated SQL).*

### 3. Verify Database CRUD Connectivity
Run our diagnostics script to test Auth tables, cascade deletes, and foreign key relations:
```bash
node scratch/test-db.js
```

### 4. Run the Next.js Workspace
Launch the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the workspace. Log in using `dev@rrgpt.internal` in local testing to bypass email verification.

---

## 🔒 Memory & Safety Guardrails

### 1. Input/Output Safety Scans (`src/lib/safety.ts`)
- **Prompt Injection Protection**: Validates user inputs against override expressions. If a violation is caught, the gateway blocks execution instantly with a `400 Bad Request` safety alert.
- **Credential Masking**: Scans final completions and masks database passwords (`postgresql://...`) and cloud API keys (`sk-***`, `AIzaSy-***`) before logging to persistent storage.

### 2. Rolling Summary Memory Consolidation
- When a thread length exceeds 8 messages, `/api/chat` triggers context compaction.
- The route compiles older turns, prompts the LLM to summarize them in under 150 words, and mounts the summary as a `system` instruction context prefix. This retains recent multi-turn context while saving up to 70% in token budget.

### 3. Server-Side Rate Limiting (`src/lib/rate-limit.ts`)
- Implements an in-memory sliding window IP rate limiter.
- Limits are set to **15 chat requests/min** and **5 document uploads/min** to prevent denial-of-service attempts.

---

## 📊 Usage Cost Model

Telemetry costs are calculated dynamically based on input/output pricing per 1M tokens:

| Model ID | Input Cost (Per 1M) | Output Cost (Per 1M) | Context Window |
| :--- | :--- | :--- | :--- |
| **Gemini 1.5 Flash** | $0.075 | $0.30 | 1M |
| **Gemini 1.5 Pro** | $1.25 | $5.00 | 2M |
| **GPT-4o Mini** | $0.15 | $0.60 | 128k |
| **Llama 3 (Ollama)** | $0.00 | $0.00 | 8k |

---

## 🧪 Evaluation Harness

RRGpt includes a prompt quality auditor (`scratch/run-evals.js`) evaluating:
- **Directness compliance**: Rejecting conversational padding ("Hello", "Great question").
- **Typesetting accuracy**: Verifying math LaTeX output structures.
- **Safety checks**: Ensuring prompt overrides are blocked.

To execute the validation audit:
```bash
node scratch/run-evals.js
```
The results are compiled in [evaluation_results.md](file:///c:/Users/RISHI%20RAMAN/Desktop/RRGpt/evaluation_results.md).
