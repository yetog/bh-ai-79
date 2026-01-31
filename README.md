# Black Hole AI - Complete Project Documentation

## Executive Summary

**Black Hole AI** is a multi-tenant personal knowledge management system that transforms scattered digital content into actionable insights through AI-powered analysis. The system provides secure file ingestion, semantic search, and intelligent reflection capabilities with JSON-driven configuration and complete tenant isolation.

**Core Value Proposition:**  
Enterprise-grade RAG (Retrieval-Augmented Generation) platform that enables users to upload files, create datasets, and chat with their content using advanced AI—all while maintaining strict data security, isolation, and auditability.

---

## Meeting Notes (8/19/2025)

**Update:**  
After a technical review and team discussion, we have made several final decisions on the core stack and architecture. We will proceed with a **Next.js frontend (with Tailwind CSS for styling)** and a **Go backend** (leveraging goroutines for concurrency and performance). Authentication will use **Google OAuth** with JWT protection for all APIs. **PostgreSQL** remains our database, and we will add vector database support (pgvector, Weaviate, or Pinecone) for semantic AI search. Object storage will be handled with IONOS S3-compatible buckets, automatically provisioned per user. Workflow automation will be managed by **self-hosted N8N**. The team is aligned to prioritize microservices deployment, robust user data isolation, and a delta-based AI training strategy to optimize compute usage and costs.

---

# 1. Key Decisions & Next Steps

## Frontend

**Framework:** **Next.js** chosen over React

- Better for **server-side rendering** and faster page loads.
- Handles routing and multi-page architecture more cleanly.

**Styling:** Use **Tailwind CSS**

- Lightweight, customizable, and preferred over Bootstrap.

**Frontend Tasks:**

- Build upload UI and chatbot interface.
- Implement drag-and-drop upload functionality.
- Handle **input validation** (but rely on backend for security).

---

## Backend

**Language & Framework:**

- **Go (Golang)** preferred over Python for performance.
- Will leverage **Go routines** for concurrency.

**Database:**

- **PostgreSQL** confirmed as the primary DB.
- Will integrate **vector database** support later for AI search.

**Authentication:**

- Use **Google OAuth** for secure sign-in.
- Protect APIs with **JWTs** (JSON Web Tokens).

**APIs:**

- Build endpoints for:
  - User signup & authentication.
  - Automatic **bucket creation** per user (for file uploads).
  - File uploads to **object storage**.
  - AI query requests (to be finalized).

---

## AI Integration

**Model Options:**

- **IONOS AI Model Hub** vs **OpenAI API** vs **Claude API**.
- Decision pending based on **cost efficiency** and **API credits**.

**Training Strategy:**

- On file upload:
  - Decide whether to **train only new documents (delta)** or retrain the entire dataset.
  - Consider letting users **choose which files to analyze**, similar to Notebook LM.

**N8N Workflow Automation:**

- Likely to use **self-hosted N8N**.
- Automate file ingestion, preprocessing, and AI queries.
- Trigger workflows via API/webhooks.

---

## Infrastructure

- Likely adopting a **microservices architecture**:
  - **Frontend service** (Next.js + Tailwind).
  - **Backend service** (Go).
  - **Authentication middleware** (integrated with backend).
  - **N8N service** for workflow automation.
- Hosted on **IONOS VMs** with object storage for user data.

---

## Immediate Action Items

| **Owner**         | **Task**                                        | **Priority** |
|-------------------|-------------------------------------------------|--------------|
| gmZay             | Keep building frontend (Next.js + Tailwind)     | High         |
| cocacolasante     | Start backend setup in Go                       | High         |
| gmZay             | Define **database schema**                      | High         |
| gmZay & cocacolasante | Research **vector DBs** & select solution   | Medium       |
| gmZay & cocacolasante | Finalize **AI integration strategy** (IONOS vs OpenAI vs Claude) | Medium       |
| gmZay             | Create N8N workflows for file ingestion & AI trigger | Medium     |
| cocacolasante     | Set up **OAuth** and secure JWT-based auth      | High         |
| gmZay & cocacolasante | Draft API endpoints for file uploads & queries | High      |

---

# 2. Architecture & Technical Analysis

**Frontend & Backend Separation:**  
Choosing **Next.js** lets you offload rendering to the server, improving performance.  
Using **Go** for backend ensures fast API responses, especially since AI and file processing are resource-intensive.

**Object Storage Automation:**  
Each user automatically gets a **dedicated storage bucket** on signup via an API call.  
This setup ensures data separation and simplifies RAG (retrieval-augmented generation).

**Vector Database Requirement:**  
Needed for **semantic search** across uploaded files.  
Options include **Weaviate**, **Pinecone**, or **pgvector** (Postgres extension).

**AI Training Optimization:**  
Avoid retraining the full dataset every time:

- Delta-based retraining saves compute time and credits.
- Give users control over which files to analyze.

**Security Considerations:**

- **Input sanitization** to prevent SQL injection attacks.
- Signed URLs + SSL enforcement for secure file access.
- Server-side validation is mandatory since frontend checks are bypassable.

---

# 3. Technical Terms Explained

| **Term**              | **Definition**                                                                 |
|-----------------------|--------------------------------------------------------------------------------|
| **Next.js**           | React-based framework with built-in server-side rendering and optimized routing. |
| **Tailwind CSS**      | Utility-first CSS framework for faster, more customizable styling.              |
| **Go (Golang)**       | Compiled programming language known for speed, concurrency, and efficiency.     |
| **Python vs Go**      | Python is slower due to being interpreted; Go is compiled, making it better for handling AI + file workflows. |
| **JWT (JSON Web Token)** | Token-based authentication method for securely verifying users between frontend and backend. |
| **OAuth**             | Secure authorization framework (e.g., Google Sign-In).                          |
| **Object Storage**    | Scalable storage where files are stored as “objects” with metadata, ideal for handling user uploads. |
| **N8N**               | Open-source automation platform for orchestrating tasks via workflows and API triggers. |
| **Vector Database**   | Specialized database for semantic search, letting AI understand meaning rather than keywords. |
| **RAG (Retrieval-Augmented Generation)** | AI technique combining vector search + LLM responses for accurate answers. |
| **Signed URLs**       | Time-limited URLs granting secure access to private files.                       |

---

## Summary

This project is converging on a **Next.js frontend + Go backend** with **PostgreSQL**, **object storage**, and **vector database support**. AI integration will leverage either **IONOS Model Hub**, **OpenAI**, or **Claude**, with N8N managing automation workflows.

Immediate focus:

- Finalize **stack** decisions
- Build **frontend upload + chatbot UI**
- Set up **Go backend APIs**
- Design **database schema**
- Plan **AI integration + vector search**
