# GitForge Documentation

Welcome to the GitForge knowledge base. Documentation here evolves **with** the
code — every development phase updates the relevant sections, so nothing drifts
out of sync.

| # | Section | What it's for |
|---|---------|---------------|
| 01 | [Concept Handbook](./01_Concept_Handbook/) | A **learning book**. Teaches every concept in the project, beginner → advanced, with analogies, complexity, trade-offs, and interview questions. |
| 02 | [Architecture Guide](./02_Architecture_Guide/) | System design with Mermaid diagrams and the rationale behind each decision. |
| 03 | [Developer Guide](./03_Developer_Guide/) | Per-module reference: purpose, responsibilities, public API, internal flow, extension points. |
| 04 | [API Documentation](./04_API_Documentation/) | Every HTTP endpoint: params, request/response shapes, status codes, examples. |
| 05 | [Testing Guide](./05_Testing_Guide/) | Test strategy, how to run, what each suite guards. |
| 06 | [Deployment Guide](./06_Deployment_Guide/) | Local setup, Docker, docker-compose, CI/CD. |
| 07 | [Interview Guide](./07_Interview_Guide/) | Project narrative, design patterns, trade-offs, 50+ Q&A. |

## What is GitForge?

GitForge is a **Git-inspired version control system built from scratch** (no Git
used internally) paired with a premium, interactive frontend for visualizing and
understanding a repository's evolution — an interactive commit DAG, a diff
viewer, developer analytics, and a **Repository Time Machine** that replays
history.

- **Backend:** Python · FastAPI · SQLite. A real content-addressable object
  store, refs/HEAD, a staging index, a commit DAG, three-way merge, diff, and
  rule-based insights, behind a clean service/DTO/API architecture.
- **Frontend:** React · TypeScript · TailwindCSS · Framer Motion · React Flow ·
  Recharts. A dark, glassmorphic developer tool.

## Reading order

New to the project? Start with the [Concept Handbook](./01_Concept_Handbook/)
chapter on content-addressable storage, then the
[Architecture Guide](./02_Architecture_Guide/) overview, then browse the
[Developer Guide](./03_Developer_Guide/).
