import type { Storyboard } from "@/shared/storyboard/types";

export const storyboardA: Storyboard = {
  concept: "a",
  name: "Wonderverse",
  tagline: "The park opens like a film: letterbox, title card, slow push-in.",
  direction:
    "A premium film opening turned into a website. Every scene is composed as a shot: a 2.39:1 letterbox frame, title cards set in a thin condensed face, slow camera push-ins and mask wipes between scenes. The pace is calm and confident; light (tungsten amber) is the only accent and it only appears where something is lit.",
  signature:
    "The aperture. The site opens as a black screen with letterbox bars; as the visitor scrolls out of the hero the bars draw back and the frame opens to full bleed. At the very end the bars close again around the final shot, like the last frame of a film.",
  palette: [
    { name: "Velvet Ink", hex: "#120C1C", role: "Base: page ground, letterbox bars" },
    { name: "Theatre Plum", hex: "#2B1A3D", role: "Surfaces: drawers, menu, visit panels" },
    { name: "Dusk Violet", hex: "#6B4FA0", role: "The twilight band in the day-to-night scene only" },
    { name: "Tungsten", hex: "#E8B04B", role: "Light only: primary buttons, glows, lit details" },
    { name: "Pearl", hex: "#EDE8F3", role: "Type and icons on dark grounds" },
    { name: "Neon Rose", hex: "#FF5C8A", role: "After-dark sign glow (scene 07 onwards)" },
  ],
  type: {
    display: "Big Shoulders (variable, weights 100–900, opsz axis)",
    body: "Instrument Sans (variable, width 75–100)",
    notes:
      "Title cards use Big Shoulders at weight 200 with wide tracking (0.08em) like film credits; dramatic moments switch the same family to weight 800. Body copy is Instrument Sans 17px/1.6 at width 92. Scale: 14 / 17 / 22 / 32 / 56 / 96 / clamp(96px, 16vw, 280px).",
  },
  motionLanguage: [
    "Slow push-ins: media scales 1.12 → 1.00 over the scene's scroll distance (scrub 1).",
    "Word reveals: SplitText words rise from yPercent 110 → 0 inside an overflow-hidden mask, stagger 0.06s, ease expo.out, 1.1s.",
    "Mask wipes between scenes: clip-path inset() animated vertically, scrubbed to scroll, never a hard cut.",
    "Layered parallax capped at 15% travel; text never parallaxes.",
    "Durations long on entrances (0.9–1.4s), short on exits (0.4–0.6s).",
  ],
  components: [
    "Magnetic primary button (follows the pointer up to 10px, springs back).",
    "Cinema cursor on desktop: a 72px ring that reads 'Play' over video and 'Drag' over the gallery.",
    "Full-screen menu overlay: each scene listed with a muted preview clip that plays on hover or focus.",
    "Scene timecode in the nav (00:01 … 00:09) showing which scene is on screen.",
    "Ticket drawer that slides in from the right with the ticket placeholder.",
  ],
  reducedMotion:
    "No pins, no scrubbing, no parallax. The letterbox starts open, every heading is shown in its final position, videos show their poster with a play button, and the gallery becomes a horizontal scroll-snap row.",
  scenes: [
    {
      n: "01",
      title: "The opening",
      intent: "First frame of the film: VELORA appears like a title card over a slow wide shot of the park.",
      slots: ["wonderverse.s01.hero"],
      initial:
        "The page loads on Velvet Ink with letterbox bars covering the top and bottom 12.5% of the viewport, so the visible frame is 2.39:1. The hero video sits behind at opacity 0 and scale 1.12. Nothing else is visible.",
      scroll:
        "The hero is pinned for 100% of the viewport height. Scrolling scrubs the push-in (scale 1.06 → 1.00), lifts the title upward by 18vh and fades it to 0, and starts drawing the letterbox bars back (scaleY 1 → 0 by the end of the pin).",
      text:
        "At 0.4s the wordmark VELORA reveals letter by letter: each character starts at yPercent 110 under a mask and rises to 0, stagger 0.05s, ease expo.out, 1.2s. At 1.3s the supporting line ('A park you enter like a film.') fades from opacity 0 / y 12px to 1 / 0 over 0.8s. The CTA follows at 1.6s, scaling 0.96 → 1 with opacity.",
      media:
        "The video fades in from 0 to 1 over 1.6s while scaling 1.12 → 1.06 (power2.out), so the camera seems to drift into the park. The poster frame shows first so there is never an empty frame.",
      motion:
        "One orchestrated load sequence (video, title, line, CTA, scroll cue). The scroll cue is a 1px Pearl line 48px tall whose fill travels top to bottom on a 2.4s loop; it stops after 3 loops.",
      depth:
        "A subtle camera feel: the title layer moves at 0.9× the scroll speed of the video layer during the pin, creating a shallow depth plane. No WebGL.",
      nav:
        "Minimal floating nav fades in at 1.8s: the VELORA wordmark left, the scene timecode '00:01' centre, a Tickets button and a Menu button right. It sits above the letterbox bar.",
      transition:
        "As the pin ends, the letterbox bars have fully drawn back, the frame is full bleed and the video hands over to the panorama of scene 02 through a vertical clip-path wipe (inset 100% 0 0 0 → 0).",
      interaction:
        "Explore the park (primary, magnetic) scrolls smoothly to scene 02. Get tickets opens the ticket drawer. Hovering the video shows the cinema cursor reading 'Play' / 'Pause'; the pause button is always visible bottom-right.",
      mobile:
        "Letterbox bars are 8% tall instead of 12.5%. The wordmark is set at 26vw. The hero uses the 1280px rendition. The pin shortens to 60% of the viewport height; the push-in still runs.",
    },
    {
      n: "02",
      title: "Enter the wonder",
      intent: "The frame opens and the whole park is revealed as one panorama, with the first numbers placeholders.",
      slots: ["wonderverse.s02.panorama", "wonderverse.s02.detail"],
      initial:
        "Full-bleed daytime panorama at scale 1.15, a foreground detail image (ride close-up) offset 20% below, and an editorial heading block on the left third.",
      scroll:
        "The section is 200vh. The panorama scales 1.15 → 1.00 across the section (scrub 1). The foreground detail rises from y 20% to −10% (faster than the panorama, ≈ 1.3×), creating parallax depth. The heading stays fixed in its column.",
      text:
        "Heading 'Step through the screen.' splits into words; as the section top reaches 70% of the viewport, each word rises from yPercent 110 to 0 behind a mask, stagger 0.06s, expo.out 1.1s. The paragraph fades in 0.2s after the last word. Three stats ('[00] rides', '[00] hectares', '[00] shows a day', each marked 'to be confirmed') roll like an odometer for 1.2s when they enter and settle on the placeholder [00]; no real number is shown until confirmed.",
      media:
        "Panorama push-in as above. The detail image is revealed with clip-path inset(100% 0 0 0) → inset(0) when it enters, then parallaxes.",
      motion: "Scrubbed scale and parallax; one word reveal; one stat count.",
      depth: "Two depth planes (panorama and foreground detail) moving at different speeds; travel capped at 15% of the viewport.",
      nav: "The nav turns into a thin glass bar: Theatre Plum at 60% opacity with a 16px backdrop blur and a hairline Pearl border at 12%. The timecode switches to 00:02.",
      transition:
        "The last 20vh of the section runs a cinematic wipe: a Velvet Ink panel slides up over the panorama (yPercent 100 → 0) carrying the first attraction's title.",
      interaction: "Stats have no hover. The panorama shows the cinema cursor ring; nothing else is clickable.",
      mobile:
        "Panorama becomes a 4:5 crop (object-position 50%); the foreground detail drops below the heading as a static framed image. Stats stack in one column.",
    },
    {
      n: "03",
      title: "The attractions",
      intent: "Each attraction is its own shot, moving sideways as the visitor scrolls down.",
      slots: ["wonderverse.s03.coaster", "wonderverse.s03.swing", "wonderverse.s03.carousel", "wonderverse.s03.wheel", "wonderverse.s03.water"],
      initial:
        "A pinned horizontal track of five full-height slides. Each slide is a 16:9 frame (70vw wide) with a title card set big beside it. Only the first slide is visible.",
      scroll:
        "The section pins for (slides − 1) × 100vh. Vertical scroll translates the track horizontally (xPercent 0 → −80%, ease none). Each slide's media scales 1.1 → 1.0 while it travels through the centre (containerAnimation).",
      text:
        "Each attraction name ('Attraction name TBC') is set at 12vw, weight 200. When its slide crosses 60% of the viewport width, the letters reveal left to right via clip-path inset(0 100% 0 0) → inset(0), 0.9s expo.out; the one-line description fades in 0.25s later.",
      media: "Videos play only while their slide is centred (playback manager); others show posters. Media enters from scale 1.1 and settles.",
      motion: "Horizontal pin with per-slide scale; slide counter '01 / 05' ticks as each one centres.",
      depth: "Each slide's title moves 0.85× the track speed so it lags behind its frame slightly, a parallax between type and picture.",
      nav: "Glass bar stays; the timecode reads 00:03. A thin progress line under the nav fills with the gallery's progress.",
      transition: "After the last slide, the track releases and the next section rises over it with a dark gradient edge.",
      interaction: "The cinema cursor reads 'Drag' over the track; dragging scrubs it. Each slide has a 'See this ride' link (opens a detail placeholder). Arrow keys move between slides when the track has focus.",
      mobile:
        "No pin: the gallery becomes a native horizontal scroll-snap row of 85vw cards with the title under each frame. Only the card most in view plays (playback manager); the rest show posters.",
    },
    {
      n: "04",
      title: "Feel the adrenaline",
      intent: "The rhythm speeds up: quick cuts, bold type and one full-screen peak.",
      slots: ["wonderverse.s04.rush", "wonderverse.s04.rush-night", "wonderverse.s04.rush-spin"],
      initial: "A black frame with the heading 'Hold on.' at weight 800, 20vw, centred.",
      scroll:
        "Pinned for 250vh. Three clips cut in sequence at 0%, 33% and 66% of the pin; each cut is a 0.35s clip-path wipe (left to right, then right to left, then top to bottom). The last clip grows from a 60vw frame to full bleed (scale and inset) by the end.",
      text:
        "Words appear one per cut: 'Hold on.' → 'Lean in.' → 'Let go.'. Each word scales from 1.4 to 1 with opacity 0 → 1 in 0.4s, and the previous word blurs out (filter blur 0 → 12px, 0.3s). The headline sits over the video with mix-blend-mode difference so footage shows through the letters.",
      media: "Faster push-ins (scale 1.2 → 1.0 per cut). A 6px directional motion blur is applied during each wipe only (CSS filter on the outgoing clip).",
      motion: "The one place the site goes fast. Cuts are scroll-timed, never auto-advancing.",
      depth: "A slight camera roll: the frame rotates −1.5° → 0° during each cut.",
      nav: "The nav hides (yPercent −100) while this scene is pinned and returns when it ends.",
      transition: "The final full-bleed clip slows, desaturates 40%, and a warm fade brings the next scene in.",
      interaction: "Pause button on the active clip. No other controls.",
      mobile: "No pin: three stacked 4:5 clips with the words over each; the wipe plays once as each enters. No roll.",
    },
    {
      n: "05",
      title: "A world for everyone",
      intent: "Slow down and warm up: families, kids and couples in an editorial collage.",
      slots: ["wonderverse.s05.family-1", "wonderverse.s05.family-2", "wonderverse.s05.family-3", "wonderverse.s05.family-4"],
      initial: "A 12-column collage: a large landscape frame (cols 1–7), a tall portrait (cols 9–12), and two smaller frames offset below.",
      scroll: "Each frame enters with a staggered mask reveal as it reaches 80% of the viewport; images drift 6% upward over the section (very gentle parallax).",
      text:
        "Heading 'Room for everyone.' in Big Shoulders weight 300, title case, softer tracking. Words fade and rise 16px, stagger 0.08s, power3.out 1s. Short paragraph below, Instrument Sans.",
      media: "Mask reveal: clip-path inset(0 0 100% 0) → inset(0), 1.1s expo.out, stagger 0.15s between frames; the image inside scales 1.08 → 1.",
      motion: "Calm. No pins.",
      depth: "Frames sit at three parallax speeds (0.94×, 1×, 1.06×).",
      nav: "Glass bar; timecode 00:05.",
      transition: "Background shifts from Velvet Ink to Theatre Plum over the last 30vh (scrubbed colour tween).",
      interaction: "Photos zoom 1.03 inside their frame on hover. No other actions.",
      mobile: "Collage becomes two columns, then one at 390px; the portrait sits between the landscapes.",
    },
    {
      n: "06",
      title: "Beyond the rides",
      intent: "Food, shows and water: three short scenes with different compositions.",
      slots: ["wonderverse.s06.food", "wonderverse.s06.shows", "wonderverse.s06.water"],
      initial: "Three alternating rows: wide image left + text right; text left + tall image right; full-bleed image with text over a dark gradient.",
      scroll: "Each row's image expands from 70% to 100% of its column width as it enters (scrubbed), like a shot widening.",
      text: "Row headings ('Food and treats', 'Shows', 'Water') reveal by words; body lines fade in after. All details marked 'to be confirmed'.",
      media: "Image expansion as above; videos play when centred.",
      motion: "One expansion per row, scrubbed.",
      depth: "None beyond the expansion; this scene stays flat and editorial on purpose.",
      nav: "Glass bar; timecode 00:06.",
      transition: "The full-bleed water row darkens at its bottom edge into the day-to-night scene.",
      interaction: "Each row has a text link ('See food options', 'See show times', 'See water rides') to placeholders.",
      mobile: "Rows stack text first, image second. No expansion; images enter with a mask reveal.",
    },
    {
      n: "07",
      title: "After dark",
      intent: "The day turns to night under the visitor's scroll and the park lights up.",
      slots: ["wonderverse.s07.dusk", "wonderverse.s07.night-1", "wonderverse.s07.night-2", "wonderverse.s07.finale"],
      initial: "Full-bleed sunset clip with a warm peach (#F2A27E) grade overlay at 35% opacity.",
      scroll:
        "Pinned for 300vh. The grade overlay moves peach → Dusk Violet → Velvet Ink (scrubbed). At 40% the night clip cross-fades in; at 70% the Ferris wheel clip takes over. Small amber and rose glow points (CSS radial gradients) fade up over lit areas.",
      text:
        "'After dark' reveals at 50% of the pin: letters fade from opacity 0 with a Neon Rose text-shadow that blooms from 0 to 24px blur, like a sign switching on (0.08s flicker steps, three steps, then steady).",
      media: "Cross-fades are scrubbed (opacity), not timed. The finale clip scales 1.0 → 1.08 during the last 30% to end on a striking full frame.",
      motion: "Colour-grade scrub, glow bloom, one sign-on moment.",
      depth: "A wet-ground band: the bottom 22% of the frame is blurred and darkened (backdrop-filter, faded in with a mask) so the lights smear like a reflection, without decoding a second copy of the video.",
      nav: "The glass bar turns darker (Velvet Ink 70%) and its border picks up a faint rose tint; timecode 00:07.",
      transition: "The night frame letterboxes slightly (bars 6%) and a clean panel slides up for Plan your visit.",
      interaction: "Pause button on the playing clip.",
      mobile: "No pin: the heading first, then three stacked frames (dusk, night, finale) with the grade applied as static overlays; the sign-on effect plays once.",
    },
    {
      n: "08",
      title: "Plan your visit",
      intent: "From film to a clear, usable page: hours, location, questions and tickets.",
      slots: ["wonderverse.s08.visit"],
      initial: "Theatre Plum panel with a 2-column layout: details left, aerial photo right.",
      scroll: "No scroll effects. Content is static once visible.",
      text: "Headings appear with a single 0.6s fade. Everything else is static. Hours, location, prices and FAQ answers read 'To be confirmed'.",
      media: "One still aerial photograph; no motion.",
      motion: "Only interaction feedback: FAQ rows expand with a 220ms height + opacity transition; buttons step on hover.",
      depth: "None.",
      nav: "Glass bar; timecode 00:08.",
      transition: "The final scene's image rises from below as the visitor reaches the end of the FAQ.",
      interaction: "FAQ accordion (keyboard: Enter/Space, arrow keys between rows), Get tickets opens the drawer, Get directions (placeholder, disabled until location is confirmed).",
      mobile: "Single column. The aerial photo moves above the details. Touch targets 48px.",
    },
    {
      n: "09",
      title: "The final moment",
      intent: "End on one shot, the name, and the invitation, then close the frame.",
      slots: ["wonderverse.s09.final"],
      initial: "Full-bleed night aerial with VELORA set at 22vw, weight 800, centred.",
      scroll: "As the visitor reaches the end, the letterbox bars return (scaleY 0 → 1, 12.5% each), closing the frame like the end of a film.",
      text: "VELORA reveals letter by letter (as scene 01, mirrored: letters drop in from yPercent −110). 'Plan your visit' CTA fades in after.",
      media: "Slow push-in 1.08 → 1.0 while the bars close.",
      motion: "The closing aperture; the opening sequence played in reverse.",
      depth: "None.",
      nav: "The nav fades out so the final frame is clean; the footer carries links.",
      transition: "Footer sits below the closed frame on Velvet Ink.",
      interaction: "Primary Get tickets (magnetic). Footer links with drawn underlines.",
      mobile: "Bars 8%; name at 28vw; CTA full width.",
    },
  ],
};
