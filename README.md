# Tutor Workspace App

A mobile-first web app prototype for tutors to organize student chapter material and AI-generated outputs.

## What it supports

- Separate workspaces for each student.
- Book and chapter management per student.
- Per-chapter page image URL storage (for uploaded book pages).
- Separate saved outputs for:
  - Chapter summary notes
  - End-of-chapter exercise answers
  - Custom exercises with answers
- Local persistence in browser `localStorage`.

## Run locally

Because this app is plain HTML/CSS/JS, you can run it with any static file server.

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.
