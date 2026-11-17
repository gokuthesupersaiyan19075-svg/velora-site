export interface StoryboardScene {
  /** "01".."09" — the scenes really are a sequence */
  n: string;
  title: string;
  /** One sentence: what this scene is for in the visitor's journey. */
  intent: string;
  /** Slot ids used by this scene (resolved against the concept's slots). */
  slots: string[];
  initial: string;
  scroll: string;
  text: string;
  media: string;
  motion: string;
  depth: string;
  nav: string;
  transition: string;
  interaction: string;
  mobile: string;
}

export interface Storyboard {
  concept: "a" | "b" | "c";
  name: string;
  /** Short line used on the hub panel. */
  tagline: string;
  direction: string;
  signature: string;
  palette: { name: string; hex: string; role: string }[];
  type: { display: string; body: string; notes: string };
  motionLanguage: string[];
  components: string[];
  reducedMotion: string;
  scenes: StoryboardScene[];
}

export const SCENE_FIELDS: { key: keyof StoryboardScene; label: string }[] = [
  { key: "initial", label: "Initial appearance" },
  { key: "scroll", label: "Scroll behaviour" },
  { key: "text", label: "Text animation" },
  { key: "media", label: "Image and video" },
  { key: "motion", label: "Motion effects" },
  { key: "depth", label: "3D and depth" },
  { key: "nav", label: "Navigation" },
  { key: "transition", label: "Transition to next scene" },
  { key: "interaction", label: "Hover, click, tap" },
  { key: "mobile", label: "Mobile" },
];
