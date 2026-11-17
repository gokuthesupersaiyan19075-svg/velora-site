# Media: sources, licences, pipeline

## Where media lives

| What | Where | Shipped with the site? |
|---|---|---|
| Videos | Streamed from the source CDNs (Pexels, Pixabay, Coverr) at 4K / 1080p / 720p | No, hotlinked |
| Video posters | `public/media/web/<id>/poster.jpg`, plus WebP sizes in `public/media/sized` | Yes |
| Photos | `public/media/photos` (selected originals), `public/media/graded` (graded copies), WebP sizes in `public/media/sized` | Only the sized WebP |
| Ride POV scrub | `public/media/seq/<id>/{1280,1920}/NNN.webp` | Yes |
| Sounds | `public/media/audio/*.m4a` (credits in `media/sounds.json`) | Yes |
| Local .mp4 encodes | `public/media/web/<id>/{sd,hd}.mp4` | No (removed from `out/`); used only if a clip has no source file |
| Downloaded originals | `media/originals` | No; to be deleted after the owner approves the selection |

## Records

- `media/sources.json`: every candidate (provider, id, creator, licence fields, world).
- `media/remote.json`: CDN renditions per video (checked with `node scripts/assets/check-links.mjs`).
- `media/manifest.json`: what the site reads (built by `scripts/assets/build-manifest.mjs`).
- `media/approvals.json` and `media/slot-choices.json`: what is approved and which picture fills which spot.
- `media/pools.json`: each world's own pool. No asset appears in both worlds.
- `media/scout/*`:
  - chooser data (`choose.json`);
  - the owner's picks (`picks.json`);
  - pasted links (`links.json`).

## Licences

- **Pexels License**: free to use, no attribution required (given anyway in each page footer). https://www.pexels.com/license/
- **Pixabay Content License**: https://pixabay.com/service/license-summary/
- **Coverr License**: https://coverr.co/license
- **Mixkit Sound Effects Free License** (sounds): https://mixkit.co/license/#sfxFree
- **Pasted links from other sites**: shown with "Licence to be confirmed by the site owner". Confirm you may use them before publishing.

Branded parks and characters (Disney, Universal, Six Flags and the like) are filtered out of every candidate list.

## Changing a picture

1. `npm run dev`, then open `/studio/choose/wonderverse` or `/studio/choose/thrillverse`.
2. Choose an option, or paste a link and pick the spot.
3. Click **Apply my choices to the site**. This runs `import-picks`, `pools` and `build-manifest`.
4. Publish again (see the README).
