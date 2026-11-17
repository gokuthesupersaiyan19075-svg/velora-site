# Claude Code Project Rules

## Project
Build a premium, cinematic and futuristic amusement park website for families, children, couples and thrill seekers. The goal is an immersive digital experience that makes visitors feel they are entering the park—not browsing a conventional brochure website.

VELORA is a fictional park. Its location, hours, prices, ride facts and other details are believable fictional information approved by the owner, kept in ONE place (`src/park/content.ts`); change them there, never hard-code new facts elsewhere.

Bookings: visitors book on each world's tickets page (shared `BookingForm` → `src/park/booking.ts` → Supabase `create_booking`, schema and RLS in `supabase/migrations`). No online payment. Staff manage bookings at `/admin` (Supabase Auth + `public.admins`). Only the anon key ships to the browser; never use or expose the service-role key.

## Required stack
- Next.js with React and TypeScript
- Tailwind CSS for styling and responsive layout
- GSAP + ScrollTrigger for advanced scroll choreography and pinned sections
- Framer Motion for interface transitions and smaller component interactions
- CSS/SVG for masks, depth and lightweight visual effects
- Three.js / React Three Fiber only when a specific experience genuinely needs 3D
- Lenis only if it remains compatible with native scrolling, accessibility and ScrollTrigger

Do not add libraries without a clear need. Keep dependencies lean.

## Quality requirements
- Mobile-first, responsive, accessible and production-minded.
- Smooth, deliberate motion; avoid unnecessary effects and scroll hijacking.
- Prioritize real, approved photography and video. Do not invent or silently substitute assets.
- Optimize media, lazy-load below-the-fold content, pause off-screen video and provide poster fallbacks.
- Respect reduced-motion preferences and maintain keyboard access, readable contrast and visible focus states.
- Keep code modular, reusable, typed and easy to maintain.
- Verify performance and behavior on mobile as well as desktop.

## Product structure (decided)
VELORA is ONE amusement park website offering TWO permanent experiences of the same park. (A third, "The Living Universe", was removed by the user; do not bring it back.) Never recommend dropping or merging the two.
- `/` is the public experience-selection portal (brand, opening animation, the two experience previews, entry actions). Never present it as an internal comparison tool; never show "Concept A/B" to customers.
- `/wonderverse`: Wonderverse ("Where imagination comes alive"), the original Concept A design in `src/concepts/a`. `/thrillverse`: Thrillverse ("Where limits disappear"), the original Concept B design in `src/concepts/b`. Old `/cinematic` and `/adrenaline` URLs redirect.
- Attractions are assigned to a world by INTENSITY, not land vs water (`world` field in src/park/content.ts): Wonderverse = magical, family, children's, gentle water, shows, food, exploring; Thrillverse = extreme coasters, high-speed rides, big drops, extreme slides and rafting, intense waves, adventure challenges. Exception: Wonderverse keeps its approved cinematic coaster scene (S04) exactly, footage included, followed by an optional, never-forced "Explore Thrillverse" invitation.
- Each experience is a complete, independently navigable site (home, attractions, food and entertainment, plan your visit, FAQs, tickets) with its own layout, typography, motion, transitions, media and navigation. Preserve the approved designs and motion of both exactly; extend, never rebuild.
- Both read the same park content (src/park) and share business logic (content, tickets, bookings, future backend). Never duplicate business logic per experience.
- Each experience uses its own photos and videos: no asset appears in both.
- Each experience has a switcher to the other one that keeps the visitor on the equivalent page; the preferred experience is remembered and the portal stays reachable.
- Internal tools (storyboards, asset board) live under `/studio` and are never linked from customer-facing pages.

## Media, storage and hosting (user requirements)
- Downloaded assets are candidates, not approved; the user personally selects. After approval, delete rejected and unused assets.
- Project media on the laptop must stay under 2 GB in total. Never download whole libraries; avoid duplicates.
- Final selected media is served from free cloud storage; the live site must not depend on this laptop, localhost or a dev server.
- Hosting and storage must be free (no paid plans, subscriptions or surprise charges) and easy to redeploy.

## Workflow
Keep tasks focused; inspect only relevant files and avoid unnecessary whole-project reanalysis. Preserve existing work, assets and animations when changing architecture.
