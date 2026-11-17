import type { ExperienceId } from "@/shared/media/pools";

export type { ExperienceId };

export interface Experience {
  id: ExperienceId;
  name: string;
  /** The promise shown on the portal and in the switcher. */
  promise: string;
  /** One or two sentences describing how this experience feels. */
  summary: string;
  href: `/${ExperienceId}`;
  /** Colours used by shared chrome (portal panel, switch curtain). Each experience's own theme lives in its folder. */
  colors: { bg: string; fg: string; accent: string };
}

export const experiences: Experience[] = [
  {
    id: "wonderverse",
    name: "Wonderverse",
    promise: "Where imagination comes alive.",
    summary: "Carousels, the wheel, gentle water, shows and treats, filmed like the opening of a film: sweeping shots, golden light and a day that turns into a glowing night.",
    href: "/wonderverse",
    colors: { bg: "#120C1C", fg: "#EDE8F3", accent: "#E8B04B" },
  },
  {
    id: "thrillverse",
    name: "Thrillverse",
    promise: "Where limits disappear.",
    summary: "Extreme coasters, big drops, white water and adventure. Bold type that moves with you, quick cuts, and a ride you drive with your own scroll.",
    href: "/thrillverse",
    colors: { bg: "#2E2BFF", fg: "#F7F7F2", accent: "#FFB800" },
  },
];

export const experienceById = (id: ExperienceId) => experiences.find((e) => e.id === id)!;

/** Pages every experience provides, so switching keeps the visitor on the equivalent page. */
export const sitePages = [
  { path: "", label: "Home" },
  { path: "/attractions", label: "Attractions" },
  { path: "/food-and-shows", label: "Food and shows" },
  { path: "/plan", label: "Plan your visit" },
  { path: "/tickets", label: "Tickets" },
] as const;

/** "/thrillverse/attractions/tempest" → { id: "thrillverse", rest: "/attractions/tempest" } */
export function parseExperiencePath(pathname: string): { id: ExperienceId | null; rest: string } {
  const m = pathname.match(/^\/(wonderverse|thrillverse)(\/.*)?$/);
  return m ? { id: m[1] as ExperienceId, rest: m[2] ?? "" } : { id: null, rest: "" };
}

export const PREFERRED_KEY = "velora:experience";
