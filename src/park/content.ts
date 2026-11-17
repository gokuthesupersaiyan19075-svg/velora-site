/**
 * VELORA park content — the ONE source of truth that both worlds read.
 * Change a name, description or fact here and every experience updates.
 *
 * VELORA is a fictional park: every name, fact, time and price below is invented for the website
 * (approved by the owner). `tbc()` still guards any fact left empty.
 */

export const TBC = "To be confirmed";
export const tbc = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? TBC : String(v));

export type AttractionCategory = "thrill" | "family" | "water" | "classic" | "adventure";
/**
 * Which of the two worlds features an attraction, decided by INTENSITY, not by land or water:
 * Wonderverse = magical, family, children's, gentle water, shows and exploring;
 * Thrillverse = extreme coasters, high-speed rides, big drops, extreme water, intense waves, adventure challenges.
 * (Exception by decision: Wonderverse keeps its approved cinematic coaster scene.)
 */
export type World = "wonderverse" | "thrillverse";
export type ZoneId = "thrill-heights" | "wonder-gardens" | "splash-lagoon" | "lantern-quarter";

export interface Zone {
  id: ZoneId;
  name: string;
  line: string;
}

export interface Attraction {
  slug: string;
  name: string;
  category: AttractionCategory;
  world: World;
  zone: ZoneId;
  /** What kind of ride this is, in plain words. */
  type: string;
  /** One line for cards. */
  line: string;
  /** Short paragraph for the detail page. */
  description: string;
  /** Lit or best experienced at night. */
  night?: boolean;
  /** Facts that must come from the park. */
  facts: { minHeightCm: number | null; durationMin: number | null; intensity: "gentle" | "moderate" | "high" | null; accessibility: string | null };
}

export interface Venue {
  slug: string;
  name: string;
  kind: "dining" | "show" | "event";
  line: string;
  description: string;
  night?: boolean;
  facts: { times: string | null; location: string | null };
}

export interface TicketType {
  slug: string;
  name: string;
  line: string;
  includes: string[];
  /** Price in the park's currency (park.currency). */
  price: number | null;
  /** How many people one ticket admits. */
  admits: number;
}

export interface Faq {
  q: string;
  /** null = answer not confirmed yet. */
  a: string | null;
}

export const park = {
  name: "VELORA",
  tagline: "One park. Two worlds.",
  intro:
    "VELORA is an amusement park built for every kind of day out: big coasters and drop towers, gentle rides for little ones, water to cool off in, food worth queueing for, and a park that comes alive with light after dark.",
  facts: {
    location: "Lake Aurelia Road, Novara Bay" as string | null,
    openingHours: "Daily 10:00 to 22:00 (last entry 20:30)" as string | null,
    season: "Open all year; closed on Tuesdays from November to February" as string | null,
    phone: "+1 555 0142 300" as string | null,
    email: "hello@velorapark.example" as string | null,
    parking: "4,000 spaces at the Main Gate car park, ₹400 per car per day (free for Season Pass holders). EV charging in rows A to C." as string | null,
    publicTransport: "The free VELORA Shuttle runs every 15 minutes from Novara Central station (20 minutes). City buses 12 and 40 stop at the Main Gate." as string | null,
  },
  /** Numbers shown on the home pages. */
  stats: { rides: 19, hectares: 48, showsPerDay: 6 },
  currency: "₹",
  /** Evening hours, used by the night scenes. */
  evening: "Rides stay lit until 22:00 and Night Bloom fireworks start at 21:30 every night.",
  ticketUrl: null as string | null, // bookings are made on /<experience>/tickets and saved in Supabase
};

/** "₹2,499" */
export const price = (n: number | null) => (n === null ? TBC : `${park.currency}${n.toLocaleString("en-IN")}`);

export const zones: Zone[] = [
  { id: "thrill-heights", name: "Thrill Heights", line: "Coasters, drop towers and the park's biggest moments." },
  { id: "wonder-gardens", name: "Wonder Gardens", line: "Carousels, gentle spins and rides sized for small adventurers." },
  { id: "splash-lagoon", name: "Splash Lagoon", line: "Slides, rapids and pools for the warmest part of the day." },
  { id: "lantern-quarter", name: "Lantern Quarter", line: "The illuminated heart of the park: the wheel, food stalls and night shows." },
];

export const attractions: Attraction[] = [
  {
    slug: "skyline-serpent",
    name: "Skyline Serpent",
    category: "thrill",
    world: "thrillverse",
    zone: "thrill-heights",
    type: "Looping steel roller coaster",
    line: "Loops, rolls and a first drop you will feel in your stomach.",
    description: "Our signature coaster climbs high above Thrill Heights before diving into a run of loops and tight rolls. Ride at dusk to see the park lights come on beneath you.",
    facts: { minHeightCm: 140, durationMin: 3, intensity: "high", accessibility: "Transfer from a wheelchair is required; companion seating available." },
  },
  {
    slug: "velocity-ridge",
    name: "Velocity Ridge",
    category: "thrill",
    world: "thrillverse",
    zone: "thrill-heights",
    type: "High-speed coaster",
    line: "Fast from the first second, with airtime over every hill.",
    description: "Velocity Ridge is all about speed: quick climbs, long dips and the floating feeling of airtime on every crest.",
    facts: { minHeightCm: 130, durationMin: 2, intensity: "high", accessibility: "Transfer from a wheelchair is required." },
  },
  {
    slug: "night-comet",
    name: "Night Comet",
    category: "thrill",
    world: "wonderverse",
    zone: "lantern-quarter",
    type: "Illuminated family coaster",
    line: "A coaster that glows, best ridden after sunset.",
    description: "Night Comet threads through the Lantern Quarter wrapped in light. Thrilling enough for big riders, friendly enough for the first coaster of the day.",
    night: true,
    facts: { minHeightCm: 110, durationMin: 2, intensity: "moderate", accessibility: "Transfer from a wheelchair is required; riders under 120 cm ride with an adult." },
  },
  {
    slug: "starfall-tower",
    name: "Starfall Tower",
    category: "thrill",
    world: "thrillverse",
    zone: "thrill-heights",
    type: "Drop tower",
    line: "A slow climb, a long look over the park, then the fall.",
    description: "Starfall Tower lifts riders high above VELORA, pauses for the view, and lets go.",
    facts: { minHeightCm: 130, durationMin: 2, intensity: "high", accessibility: "Transfer from a wheelchair is required." },
  },
  {
    slug: "tempest",
    name: "Tempest",
    category: "thrill",
    world: "thrillverse",
    zone: "thrill-heights",
    type: "Giant swinging pendulum",
    line: "Swing higher with every pass until the horizon tips over.",
    description: "Tempest swings riders back and forth in ever-bigger arcs while spinning, for a ride that never feels the same way twice.",
    facts: { minHeightCm: 130, durationMin: 3, intensity: "high", accessibility: "Transfer from a wheelchair is required." },
  },
  {
    slug: "orbit-flyer",
    name: "Orbit Flyer",
    category: "thrill",
    world: "wonderverse",
    zone: "lantern-quarter",
    type: "Tower swing ride",
    line: "Chair swings that circle high above the crowds.",
    description: "Orbit Flyer lifts its swings up the tower and sends them flying outward in wide, sweeping circles. Spectacular when lit at night.",
    night: true,
    facts: { minHeightCm: 120, durationMin: 3, intensity: "moderate", accessibility: "Transfer from a wheelchair is required." },
  },
  {
    slug: "vortex",
    name: "Vortex",
    category: "thrill",
    world: "thrillverse",
    zone: "thrill-heights",
    type: "Spinning thrill ride",
    line: "Spins, tilts and lights in every colour.",
    description: "Vortex spins riders in one direction while the whole ride tilts in another. Bring a friend and hold on.",
    night: true,
    facts: { minHeightCm: 130, durationMin: 3, intensity: "high", accessibility: "Transfer from a wheelchair is required." },
  },
  {
    slug: "aurelia-carousel",
    name: "Aurelia Carousel",
    category: "classic",
    world: "wonderverse",
    zone: "wonder-gardens",
    type: "Golden carousel",
    line: "Hand-painted horses, warm lights and music.",
    description: "A classic carousel glowing with golden lights. A favourite for first rides, last rides and every photo in between.",
    night: true,
    facts: { minHeightCm: null, durationMin: 4, intensity: "gentle", accessibility: "Wheelchair-accessible chariot; children under 100 cm ride with an adult." },
  },
  {
    slug: "velora-wheel",
    name: "The VELORA Wheel",
    category: "classic",
    world: "wonderverse",
    zone: "lantern-quarter",
    type: "Observation wheel",
    line: "The best view of the park, by day and by night.",
    description: "Slow, high and calm: the wheel lifts you over the whole park. After dark it becomes the brightest landmark in VELORA.",
    night: true,
    facts: { minHeightCm: null, durationMin: 15, intensity: "gentle", accessibility: "Step-free, wheelchair-accessible gondolas." },
  },
  {
    slug: "bumper-bay",
    name: "Bumper Bay",
    category: "family",
    world: "wonderverse",
    zone: "wonder-gardens",
    type: "Bumper cars",
    line: "Friendly collisions for all ages.",
    description: "Pick a car, pick a rival, and bump your way around the arena.",
    facts: { minHeightCm: 110, durationMin: 4, intensity: "gentle", accessibility: "Transfer required; riders under 140 cm ride with an adult." },
  },
  {
    slug: "whirligig",
    name: "Whirligig",
    category: "family",
    world: "wonderverse",
    zone: "wonder-gardens",
    type: "Family spinning ride",
    line: "Colourful spins that make everyone laugh.",
    description: "Whirligig is a gentle, colourful spin for younger riders and the grown-ups riding with them.",
    facts: { minHeightCm: 90, durationMin: 3, intensity: "gentle", accessibility: "Transfer required; riders under 120 cm ride with an adult." },
  },
  {
    slug: "little-comet",
    name: "Little Comet",
    category: "family",
    world: "wonderverse",
    zone: "wonder-gardens",
    type: "Junior coaster",
    line: "A first coaster for small adventurers.",
    description: "Little Comet has all the fun of a real coaster with gentle hills made for first-time riders.",
    facts: { minHeightCm: 90, durationMin: 2, intensity: "gentle", accessibility: "Transfer required; riders under 110 cm ride with an adult." },
  },
  {
    slug: "lagoon-rapids",
    name: "Lagoon Rapids",
    category: "water",
    world: "wonderverse",
    zone: "splash-lagoon",
    type: "Splash boat ride",
    line: "A big drop and a bigger splash.",
    description: "Board a boat, climb the hill and plunge into the lagoon. You will get wet; that's the point.",
    facts: { minHeightCm: 100, durationMin: 6, intensity: "moderate", accessibility: "Transfer required; riders under 120 cm ride with an adult. You will get wet." },
  },
  {
    slug: "cascade-slides",
    name: "Cascade Slides",
    category: "water",
    world: "wonderverse",
    zone: "splash-lagoon",
    type: "Water slide tower",
    line: "Twisting slides in every colour.",
    description: "A tower of open and enclosed slides, from gentle curves to steep drops.",
    facts: { minHeightCm: 110, durationMin: 1, intensity: "moderate", accessibility: "Stairs only; lifeguards on every tower." },
  },
  {
    slug: "wave-cove",
    name: "Wave Cove",
    category: "water",
    world: "wonderverse",
    zone: "splash-lagoon",
    type: "Wave pool and splash play",
    line: "Waves, fountains and room to float.",
    description: "Wave Cove mixes a wave pool with splash play areas for younger guests.",
    facts: { minHeightCm: null, durationMin: 45, intensity: "gentle", accessibility: "Zero-depth beach entry; pool wheelchairs available." },
  },
  // Thrillverse extreme water, waves and adventure.
  {
    slug: "riptide-rapids",
    name: "Riptide Rapids",
    category: "water",
    world: "thrillverse",
    zone: "splash-lagoon",
    type: "White-water rafting",
    line: "Rough water, big drops and no staying dry.",
    description: "Round rafts take on a fast white-water channel of drops, rapids and walls of spray.",
    facts: { minHeightCm: 120, durationMin: 6, intensity: "high", accessibility: "Transfer required. You will get soaked." },
  },
  {
    slug: "freefall-flume",
    name: "Freefall Flume",
    category: "water",
    world: "thrillverse",
    zone: "splash-lagoon",
    type: "Extreme speed slide",
    line: "A near-vertical drop and pure speed to the splash.",
    description: "Freefall Flume starts with a steep, near-vertical drop and doesn't slow down until the run-out pool.",
    facts: { minHeightCm: 140, durationMin: 1, intensity: "high", accessibility: "Stairs only. Not suitable for guests with back or neck conditions." },
  },
  {
    slug: "breaker-bay",
    name: "Breaker Bay",
    category: "water",
    world: "thrillverse",
    zone: "splash-lagoon",
    type: "High-intensity surf wave",
    line: "Powerful waves to ride, surf and wipe out on.",
    description: "Breaker Bay sends big, powerful waves for bodyboarders and surfers who want more than a splash.",
    facts: { minHeightCm: 130, durationMin: 45, intensity: "high", accessibility: "Strong swimmers only; boards and lifeguards provided." },
  },
  {
    slug: "summit-challenge",
    name: "Summit Challenge",
    category: "adventure",
    world: "thrillverse",
    zone: "thrill-heights",
    type: "Adventure course and zip line",
    line: "Rope bridges, climbing walls and a zip line over the park.",
    description: "Summit Challenge is a high ropes course of bridges, climbs and balance beams that ends with a zip line over Thrill Heights.",
    facts: { minHeightCm: 120, durationMin: 40, intensity: "high", accessibility: "Harness required; maximum weight 120 kg." },
  },
];

export const venues: Venue[] = [
  { slug: "candy-lane", name: "Candy Lane", kind: "dining", line: "Cotton candy, popcorn and sweets made fresh.", description: "Follow the smell of spun sugar to Candy Lane for cotton candy, popcorn and classic fairground treats.", facts: { times: "10:00 to 22:00", location: "Wonder Gardens, beside the carousel" } },
  { slug: "midway-kitchen", name: "Midway Kitchen", kind: "dining", line: "Hearty meals between rides.", description: "Sit-down meals and quick bites to refuel between rides.", facts: { times: "11:00 to 21:00", location: "Thrill Heights, below Skyline Serpent" } },
  { slug: "lantern-night-market", name: "Lantern Night Market", kind: "dining", line: "Street-food stalls under strings of light.", description: "After sunset the Lantern Quarter fills with food stalls, music and light.", night: true, facts: { times: "18:00 to 22:00", location: "Lantern Quarter" } },
  { slug: "cirque-aurora", name: "Cirque Aurora", kind: "show", line: "Acrobats, aerialists and fire under the big top.", description: "Our circus show brings aerial acts, acrobatics and fire performers together under one tent.", facts: { times: "13:00, 16:00 and 19:00 (45 minutes)", location: "The Big Top, Lantern Quarter" } },
  { slug: "parade-of-lights", name: "Parade of Lights", kind: "show", line: "A moving parade of music, costume and colour.", description: "Performers, music and illuminated floats travel through the park.", night: true, facts: { times: "20:30 nightly", location: "Wonder Gardens to the Lantern Quarter" } },
  { slug: "night-bloom", name: "Night Bloom", kind: "event", line: "Fireworks over the lagoon to close the night.", description: "The day ends with fireworks reflected in the lagoon.", night: true, facts: { times: "21:30 nightly (12 minutes)", location: "Over Splash Lagoon, best seen from the Lantern Quarter promenade" } },
];

export const tickets: TicketType[] = [
  { slug: "day-pass", name: "Day Pass", line: "Unlimited rides for one day. Children under 3 go free.", includes: ["Entry to the park, 10:00 to 22:00", "All rides in both worlds", "Shows, parades and Night Bloom"], price: 2499, admits: 1 },
  { slug: "family-pass", name: "Family Pass", line: "One day out for two adults and two children.", includes: ["Entry for 4 people", "All rides in both worlds", "Shows, parades and Night Bloom"], price: 7999, admits: 4 },
  { slug: "after-dark", name: "After Dark Pass", line: "Evening entry from 17:00 for lights, rides and Night Bloom.", includes: ["Entry from 17:00", "All rides open after dark", "Night Bloom fireworks"], price: 1499, admits: 1 },
  { slug: "season-pass", name: "Season Pass", line: "Twelve months of VELORA, as often as you like.", includes: ["Entry every open day for 12 months", "Free parking", "10% off food and shops"], price: 9999, admits: 1 },
];

export const faqs: Faq[] = [
  { q: "When is VELORA open?", a: "Every day from 10:00 to 22:00, with last entry at 20:30. From November to February the park is closed on Tuesdays. Night Bloom fireworks start at 21:30." },
  { q: "Where is the park and how do I get there?", a: "VELORA is on Lake Aurelia Road, Novara Bay. The free VELORA Shuttle runs every 15 minutes from Novara Central station, city buses 12 and 40 stop at the Main Gate, and the car park has 4,000 spaces." },
  { q: "How much are tickets?", a: "A Day Pass is ₹2,499, the Family Pass (two adults and two children) is ₹7,999, the After Dark Pass is ₹1,499 and the Season Pass is ₹9,999. Children under 3 go free. Book online on the tickets page and pay at the gate." },
  { q: "Are there height requirements for rides?", a: "Yes. Each ride lists its minimum height, from 90 cm on Little Comet to 140 cm on Skyline Serpent and Freefall Flume. Guests are measured at the ride entrance." },
  { q: "Can I bring food and drink?", a: "Sealed water bottles and baby food are welcome, and picnics can be eaten on the Lakeside Picnic Lawn by the Main Gate. Glass and alcohol are not allowed." },
  { q: "Is the park accessible?", a: "Paths are step-free throughout. Wheelchairs and pushchairs can be borrowed free at Guest Services, and the Access Pass lets guests who cannot queue return to a ride at a set time." },
  { q: "Is there parking?", a: "Yes: 4,000 spaces at the Main Gate car park for ₹400 per car per day, with EV charging. Parking is free for Season Pass holders." },
  { q: "What happens if it rains?", a: "Most rides keep running in light rain; some outdoor rides pause during storms. If more than half the rides close for over two hours, you can come back free on another day." },
  { q: "How do I change or cancel a booking?", a: "Email hello@velorapark.example with your booking reference at least 24 hours before your visit to change the date or cancel. Payment is taken at the gate, so there is nothing to refund." },
];

/** "120 cm" or "No minimum height" */
export const heightLabel = (cm: number | null) => (cm === null ? "No minimum height" : `${cm} cm`);
/** "3 minutes" */
export const durationLabel = (min: number | null) => (min === null ? "Varies" : `${min} minute${min === 1 ? "" : "s"}`);
export const intensityLabel = (i: Attraction["facts"]["intensity"]) => (i ? i[0].toUpperCase() + i.slice(1) : "Varies");

export const categoryLabel: Record<AttractionCategory, string> = { thrill: "Thrill", family: "Family", water: "Water", classic: "Classic", adventure: "Adventure" };

export const byZone = (id: ZoneId) => attractions.filter((a) => a.zone === id);
export const byCategory = (c: AttractionCategory) => attractions.filter((a) => a.category === c);
export const attraction = (slug: string) => attractions.find((a) => a.slug === slug);
export const zone = (id: ZoneId) => zones.find((z) => z.id === id)!;
export const attractionsIn = (w: World) => attractions.filter((a) => a.world === w);
export const venue = (slug: string) => venues.find((v) => v.slug === slug);
