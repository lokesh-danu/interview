# Collaborative Workspace

Build a workspace where users upload documents (PDF, PPTX, XLSX), chat with
them, run agents against them, and produce reports. Multiple users can
collaborate in the same workspace.

## Core requirements

- Upload PDFs, PowerPoints, and Excel files to a workspace
- Extract content from uploads to enable search over documents
- Chat interface where users ask questions against one or more documents
- Ability to trigger an agent run that produces a report from workspace
  documents
- Multiple users can be members of a workspace and see each other's
  uploads/chats

## Structure

```
/frontend       # UI: upload flow, chat, loading/error states
/backend        # API, background jobs, schema
/infra
  architecture.md   # describe your infra choices (no IaC needed)
```

`infra/architecture.md` should describe, in prose/diagrams: hosting,
storage, background job/queue setup, database choice, and how you'd
sandbox any code execution (e.g. agent-generated Python) — containers,
resource limits, network isolation, cleanup. No Terraform required, just
the reasoning.

## Not in scope

- Auth/SSO polish (a stubbed login is fine)
- Production-grade CI/CD
- Algorithmic puzzle-solving — this is a product-building exercise
