<div align="center">

# ENPEI

**A high-end personal photography portfolio with a Supabase-powered studio.**

Dark, quiet and photograph-first — an irregular masonry wall, a blur-in reveal,
and a full-screen viewer that floats the capture data at the edge of every frame.

[中文文档 →](./README.zh-CN.md)

</div>

---

## Contents

- [What this is](#what-this-is)
- [Feature tour](#feature-tour)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Connecting Supabase](#connecting-supabase)
- [The studio (admin)](#the-studio-admin)
- [Deploying to Vercel](#deploying-to-vercel)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Verification](#verification)
- [Customising](#customising)
- [Troubleshooting](#troubleshooting)

---

## What this is

A complete, production-shaped portfolio site. Visitors browse an immersive
gallery; the owner signs in at a hidden `/admin` route to publish photographs
and manage collections.

It ships in **Demo Mode**. With no configuration at all it runs on curated
placeholder content — the masonry, the blur-in, the viewer and the EXIF readout
are all real and fully interactive. Adding Supabase credentials switches it to
the live archive; no code changes are required in either direction.

| Preview | |
|---|---|
| ![Hero](./docs/preview-01-hero.png) | ![The wall](./docs/preview-02-gallery.png) |
| ![Viewer with EXIF](./docs/preview-03-lightbox.png) | ![Collection](./docs/preview-04-collection.png) |
| ![Studio](./docs/preview-05-studio.png) | ![Mobile](./docs/preview-06-mobile.png) |

*(Captured in Demo Mode, so the photographs themselves are placeholders.)*

---

## Feature tour

### For visitors

- **Irregular masonry wall.** CSS multi-column, not a JavaScript layout engine:
  genuinely uneven, self-balancing, and correct in the server-rendered HTML.
- **Skeleton, then blur-in.** Every tile reserves its exact aspect-ratio box
  before an image is requested, so the columns never reflow. A shimmer skeleton
  holds the space; the photograph then fades and un-blurs into place.
- **A 1.02 hover lift.** Measured, not asserted: the pointer-over scale resolves
  to exactly `1.02`, over 1.2s on a `cubic-bezier(0.22, 1, 0.36, 1)` curve.
- **Immersive viewer.** Clicking a photograph opens a pure-black, full-viewport
  lightbox. Click the photograph to hide the interface entirely; click around it
  to close.
- **Floating EXIF.** Capture data sits at the edge of the frame in hairline
  typography — focal length leading, because that is the number a photographer
  looks for: `15mm`, `35mm`, `24-70mm`, `f/1.4`, `1/250s`, `ISO 100`, body, lens.
- **Keyboard and touch.** `←` `→` navigate, `space` hides the UI, `i` toggles
  details, `esc` closes. Drag or swipe horizontally to move between frames.
- **Smooth scrolling.** Lenis drives the whole document, and is paused while the
  viewer is open so the page cannot scroll behind it.
- **Collections.** Landscapes, Events, Portraits, Street and Architecture out of
  the box — each a real page with its own metadata and a previous/next pager.

### For the owner

- **Hidden `/admin` route.** Not linked from anywhere, `noindex` at both the
  header and robots.txt level, and excluded from the sitemap.
- **Two independent gates.** A valid Supabase session *and* membership of an
  allow-list. Neither alone is sufficient.
- **Batch drag-and-drop upload.** Drop a folder's worth of frames at once.
- **Automatic EXIF extraction.** Camera, lens, focal length, aperture, shutter,
  ISO, exposure compensation, white balance, metering and capture date are read
  in the browser and normalised for display. Focal length is even recovered from
  a zoom's designation, so a `FE 24-70mm` lens displays as `24-70mm`.
- **Automatic image pipeline.** Each upload also produces a web-sized derivative
  and a tiny blur placeholder; the untouched original is archived beside it.
  The public site never serves a 40-megapixel file to a browser.
- **Edit anything.** Title, caption, location, collection, tags, date, sort
  order, featured flag, and every EXIF field by hand.
- **Delete safely.** The storage object and the catalogue row are removed
  together, and a failed upload rolls its orphaned object back.

---

## Tech stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.3 |
| UI | React | 19.3 |
| Styling | Tailwind CSS (CSS-first `@theme` tokens) | 4.3 |
| Motion | Framer Motion | 13.2 |
| Smooth scroll | Lenis | 1.3 |
| Backend | Supabase — Auth, Postgres, Storage, RLS | supabase-js 2.116 |
| EXIF | exifr | 7.1 |
| Typeface | Inter Variable, self-hosted | 5.3 |
| Icons | Lucide | 1.45 |
| Hosting | Vercel | — |

**Requires Node.js 20.9 or newer** (a Next.js 16 requirement).

TypeScript is pinned to 5.9 rather than 7.x deliberately — 7.0 is the new native
compiler and is not yet the well-trodden path for Next.js builds.

---

## Quick start

> **On Windows you can just double-click `start.bat`** in the project root — it
> checks dependencies, starts the server and opens the browser for you.

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. That is the whole setup — it runs in Demo Mode.

To preview the studio before configuring anything, the included `.env.local`
already sets a demo password:

1. Go to <http://localhost:3000/admin>
2. Enter any e-mail address and the password `enpei-studio-preview`
3. The real dashboard opens, read-only

> The demo password only works while Supabase is unconfigured. The moment
> `NEXT_PUBLIC_SUPABASE_URL` is set, that path becomes unreachable.

---

## Connecting Supabase

Five minutes, start to finish.

### 1. Create the project

<https://supabase.com/dashboard> → **New project**. Note the region — pick the
one closest to your audience, because every gallery image is served from it.

### 2. Apply the schema

Open **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](./supabase/schema.sql), and run it.

That single file creates the tables, the indexes, the `is_admin()` helper, the
Row Level Security policies, the public `photos` storage bucket with its upload
rules, and the five starter collections. It is idempotent, so re-running it is
always safe.

### 3. Create your account

**Authentication → Users → Add user → Create new user.**

Enter your e-mail and a password, and tick **Auto Confirm User** so no
confirmation e-mail is needed.

### 4. Register yourself as an administrator

Two places must agree, and both are intentional:

```sql
-- back in the SQL Editor
insert into public.admins (email) values ('you@example.com')
  on conflict (email) do nothing;
```

…and in `.env.local`:

```bash
ADMIN_EMAILS=you@example.com
```

The database row is what the RLS policies check; `ADMIN_EMAILS` is what the
application checks. Requiring both means a typo in either one fails closed.

### 5. Add your keys

**Project Settings → Data API** and **Project Settings → API Keys**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Newer projects call the second value a **publishable key**; older ones call it
**anon**. Either name works — the app reads whichever is present.

### 6. Restart and sign in

```bash
pnpm dev
```

The Demo Mode badge disappears and `/admin` now authenticates against Supabase.
Upload something.

---

## The studio (admin)

Reached at `/admin` — deliberately unlinked.

**Library** — every photograph, searchable across titles, places, cameras, tags
and file names, filterable by collection. Edit opens a slide-over with the full
metadata form, including hand-editable EXIF for scans and film.

**Upload** — drop photographs onto the panel (or choose files). Each one is
analysed locally and shows its extracted capture data before anything is sent.
Set the collection, location and tags once for the whole batch, optionally
feature them on the homepage, then publish. Files upload sequentially with
per-file status, and a failed row rolls its storage object back.

**Collections** — create, rename, describe and reorder. Deleting a collection
never deletes photographs; they fall back to *Unsorted*.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. Vercel → **Add New → Project** → import it.
3. Vercel detects Next.js. Leave the build settings alone.
4. Add the environment variables (below) for **Production, Preview and
   Development**.
5. Deploy.
6. In Supabase, add your Vercel domain under **Authentication → URL
   Configuration → Redirect URLs**.
7. Set `NEXT_PUBLIC_SITE_URL` to the production domain so canonical URLs,
   Open Graph tags and the sitemap are correct, then redeploy.

**Storage egress is the cost to watch.** Every gallery image is served from
Supabase Storage and optimised by Vercel's image pipeline, which caches
aggressively (`minimumCacheTTL` is 30 days here). For a personal archive this is
comfortably inside the free tier; a very large one may want a CDN in front.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | to leave Demo Mode | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | to leave Demo Mode | Publishable / anon key. RLS-protected, safe in the browser |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | alternative | Newer name for the same key |
| `ADMIN_EMAILS` | yes | Comma-separated allow-list. **Server-only.** Unset means nobody can sign in |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Server-only, bypasses RLS. Only for scripts; normal admin work uses the user's session |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URLs, Open Graph, sitemap |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | no | Defaults to `photos` |
| `DEMO_ADMIN_PASSWORD` | no | Local dashboard preview while unconfigured. Never set in production |

---

## Project structure

```
src/
├── proxy.ts                     Next 16's renamed middleware — admin session refresh
├── app/
│   ├── layout.tsx               Root shell only (html/body, fonts)
│   ├── globals.css              Design tokens, base layer, Lenis runtime styles
│   ├── icon.svg  robots.ts  sitemap.ts
│   ├── (site)/                  Public route group — gets the masthead, footer, Lenis
│   │   ├── layout.tsx
│   │   ├── page.tsx             Hero · statement · index · collections
│   │   ├── template.tsx         Per-navigation entrance transition
│   │   ├── about/page.tsx
│   │   ├── collections/[slug]/page.tsx
│   │   └── not-found.tsx
│   └── admin/                   Studio route group — no public chrome, native scroll
│       ├── layout.tsx
│       ├── page.tsx             Sign-in
│       ├── actions.ts           Every Server Action (auth + all mutations)
│       └── dashboard/page.tsx   Authoritative authorisation lives here
├── components/
│   ├── smooth-scroll.tsx  site-header.tsx  site-footer.tsx
│   ├── home/hero.tsx
│   ├── gallery/photo-tile.tsx          Tile, skeletons, blur-in
│   ├── gallery/masonry-gallery.tsx     The wall + viewer state
│   ├── lightbox/lightbox.tsx           Portalled immersive viewer
│   ├── lightbox/exif-readout.tsx       The floating EXIF typography
│   ├── admin/{dashboard,uploader,photo-library,collection-manager,controls,login-form}.tsx
│   └── ui/reveal.tsx
└── lib/
    ├── types.ts      env.ts      utils.ts
    ├── photos.ts     The single read path (real or demo)
    ├── demo-data.ts  25 seeded photographs across 5 collections
    ├── exif.ts       Display normalisation: 0.004 → "1/250s", lens → "24-70mm"
    ├── process-photo.ts  Browser ingest: EXIF + placeholder + derivative
    ├── auth.ts       Server-only admin identity and allow-list
    └── supabase/{client,server,admin,session}.ts

supabase/schema.sql              The whole backend, in one idempotent file
scripts/smoke.mjs                Headless interaction tests
```

---

## How it works

A few decisions worth knowing about, because they are the ones that are easy to
get subtly wrong.

### Masonry without a layout engine

The wall is CSS multi-column (`columns-1 sm:columns-2 lg:columns-3 2xl:columns-4`
with `break-inside-avoid`). Unlike a JavaScript masonry library it needs no
measurement pass, so it is correct in the server-rendered HTML with no hydration
flash. Because every tile carries its stored `width`/`height`, the browser
derives an aspect ratio up front and column heights are right before a single
image has decoded.

### The blur-in pipeline

On upload, `process-photo.ts` runs three jobs in the browser before any byte is
sent: reads EXIF, renders a 24px miniature into a base64 JPEG that becomes the
`next/image` blur placeholder, and draws the photograph into a ≤2560px WebP
derivative. The derivative is what the site serves; the original is archived
under `originals/`.

Tiles whose image has a stored placeholder use `next/image`'s native blur. Every
tile additionally animates `filter: blur(16px) → blur(0)` and `opacity` on
decode — the shimmer skeleton sits underneath, so nothing ever pops in.

### EXIF normalisation

Cameras store raw numerics. `exif.ts` converts them to the notation
photographers read: `0.004` → `1/250s` (snapped to the nearest standard shutter
speed), `1.8` → `f/1.8`, `-0.333` → `-0.3 EV`. Focal length is the interesting
one: EXIF only records the single focal length used, so for a zoom the *range*
is recovered from the lens designation — `FE 24-70mm F2.8 GM II` → `24-70mm` —
which is how a photographer actually describes the lens. The field stays
hand-editable for scans and adapted glass.

### Security model

| Surface | Who may read | Who may write |
|---|---|---|
| `photos`, `collections` | anyone | allow-listed accounts only |
| `admins` | allow-listed accounts | SQL Editor / service role only |
| `photos` storage bucket | anyone | allow-listed accounts only |

Authorisation is enforced in Postgres by RLS, not in the UI. The application
checks are a second, independent gate: `proxy.ts` performs a fast optimistic
check to keep anonymous traffic off a round trip, and the dashboard Server
Component then re-verifies the session against Supabase Auth and the
`ADMIN_EMAILS` allow-list before reading a single row.

`is_admin()` is `security definer` with `set search_path = public`, so it can
consult the allow-list without being subvertible, and an unset `ADMIN_EMAILS`
grants nobody access — a forgotten environment variable fails closed.

### Why there is no route-level `loading.tsx`

A segment-level loading boundary flushes an HTTP 200 before the page has decided
whether it exists, which quietly turns an unknown collection URL into a soft 404
— a real SEO defect that is invisible in the browser. Instead, each section
resolves its own data behind its own `<Suspense>` boundary, and the collection
route settles its existence check *before* anything streams. Skeletons still
stream; `/collections/typo` returns a genuine 404.

---

## Verification

```bash
pnpm build && pnpm start -- -p 3213   # terminal 1
pnpm smoke                            # terminal 2
```

`scripts/smoke.mjs` drives a real headless Chrome over the DevTools Protocol and
measures the rendered result rather than trusting class names — including the
actual computed scale on hover and the actual pixel size of the photograph.
Current state: **30/30 checks pass**.

```
PASS  dark mode is the working colour scheme         color-scheme: dark
PASS  canvas resolves near-black                     luminance 7/255
PASS  Inter is loaded, not silently swapped          document.fonts.check passed
PASS  masonry produces multiple columns              3 column offsets at 1440px
PASS  column layout is irregular, not a grid         5 distinct aspect ratios
PASS  every tile reserves its box before load        25/25 tiles
PASS  hover scale measures 1.02                      1 → 1.02
PASS  the photograph physically grows 2%             2.00% wider
PASS  viewer is pure black                           rgb(0, 0, 0)
PASS  viewer is fixed and covers the viewport        fixed, full-bleed true
PASS  EXIF block is displayed                        7/7 labels found
PASS  focal length is shown                          85mm
PASS  ArrowRight advances the viewer                 01 → 02
PASS  mobile collapses to a single column            1 column
PASS  collection route filters the wall              "Landscapes" → 7 of 25
```

---

## Customising

**Colour and type** live as Tailwind v4 tokens in `src/app/globals.css` — one
`@theme` block, no config file. The palette is deliberately narrow: deep neutrals
plus a single brass accent used only for state and focus.

**Collections** are data, not code. Add them in the studio, or change the seed
values at the end of `supabase/schema.sql`. The navigation, footer, pager and
sitemap all follow automatically.

**Copy** — the hero headline, statement, About page and footer all live in
`src/app/(site)/`. The equipment list and service descriptions are plain arrays
at the top of `about/page.tsx`.

---

## Troubleshooting

**"ADMIN_EMAILS is empty, so no account can sign in."**
Working as designed — the allow-list fails closed. Set `ADMIN_EMAILS`.

**Signed in, but the dashboard redirects back to `/admin`.**
The address must appear in *both* `public.admins` (in Postgres) and
`ADMIN_EMAILS` (in the environment). Check `select * from public.admins;`.

**Uploads fail with a storage error.**
Confirm `supabase/schema.sql` ran to completion — it creates the `photos`
bucket. Uploads are capped at 50 MB and restricted to image MIME types.

**Images 404 after upload.**
`next.config.ts` allows `**.supabase.co` under `/storage/v1/object/public/**`.
A custom storage domain needs adding to `images.remotePatterns`.

**`next build` cannot reach Supabase.**
Only pages that read photography content touch the network, and they degrade to
an empty gallery with a server-side log rather than failing the build.

---

<div align="center">

Built with Next.js, Supabase, Framer Motion and Lenis.

</div>
