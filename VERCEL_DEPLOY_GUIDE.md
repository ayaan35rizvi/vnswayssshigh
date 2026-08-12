# Varanasi Tour & Travels — Vercel Deploy Guide

This folder is a fully static build of the site (React SPA). No build step is
needed — Vercel serves it as-is.

## IMPORTANT: Environment variable (makes the booking form email you)
Before deploying (or right after, under Settings → Environment Variables):
  Name:   RESEND_API_KEY
  Value:  <your Resend API key, from resend.com → API Keys>
  Environments: Production (and Preview if you like)
Without this, the booking form falls back to "email service not configured".
Booking enquiries are sent to khanyasir7275@gmail.com (changeable via
BOOKING_RECIPIENT_EMAIL env var if desired).

## Option 1 — Upload via Vercel dashboard (easiest)
1. Go to https://vercel.com/new and sign in (GitHub/Google email works)
2. Click "Add New" → "Project"
3. Under "Import Git Repository" click "Deploy Third-Party Git Repository" — or simply drag & drop the folder into the "Drag & Drop" box if shown
   (If the drag-and-drop box is not visible, upload the project to a GitHub
   repository first: https://github.com/new → "Add file" → "Upload files" —
   upload everything in this folder, then in Vercel: New Project → import that repo)
4. Framework Preset: leave empty / select "Other"
5. Build & Output settings (only if importing a repo — for drag-and-drop skip):
   - Build Command: npm install --prefix . --no-audit --no-fund
   - Output Directory: .
6. Click "Deploy" — done, usually under 2 minutes
7. After deploy: Settings → Environment Variables → add RESEND_API_KEY → Redeploy

## Option 2 — GitHub repo import (recommended, gives free redeploys)
1. Create a new GitHub repo (github.com/new)
2. Upload every file from this folder into the repo (root, including vercel.json)
3. In Vercel: New Project → Import the repo → Deploy

## Custom domain (e.g., your Spaceship domain)
1. Vercel dashboard → your project → Settings → Domains
2. Type your domain → Add
3. Vercel shows DNS records — add them at Spaceship:
   - A record: Host "@" → IP shown by Vercel (76.76.21.21 and 76.76.21.98)
   - or CNAME: Host "www" → cname.vercel-dns.com
4. Wait for verification (minutes, sometimes up to a few hours)

## Notes
- The booking enquiry form is a visual demo on this static build; real email
  delivery needs the server backend (or point enquiries to phone/WhatsApp).
- No package.json here — this is output code, not a build project.
- vercel.json handles routing: /about, /services, /contact, /booking all work.
