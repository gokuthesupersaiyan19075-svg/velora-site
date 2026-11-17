export type AssetKind = "video" | "photo";
export type AssetStatus = "approved" | "candidate" | "rejected";
export type AssetCategory = "aerial" | "coaster" | "rides" | "family" | "food" | "shows" | "water" | "night";

/** One file on the source CDN. uhd = 4K-class (>= 2560 wide), fhd = 1080p-class, hd = 720p-class. */
export interface RemoteRendition {
  url: string;
  w: number;
  h: number;
  /** File size, when known (the file the original was downloaded from). Used for the 4K speed check. */
  bytes?: number;
}

export interface MediaAsset {
  /** e.g. "pexels-32072284" */
  id: string;
  kind: AssetKind;
  /** "link": a file the site owner pasted into the chooser from elsewhere. */
  provider: "pexels" | "pixabay" | "coverr" | "link";
  category: AssetCategory;
  title: string;
  description: string;
  sourceUrl: string;
  creator: string;
  creatorUrl: string | null;
  width: number;
  height: number;
  /** seconds, videos only */
  duration: number | null;
  fps: number | null;
  license: { name: string; url: string };
  /** The downloaded original; null for remote-only candidates (streamed from the source CDN). */
  original: { file: string; bytes: number; sha256: string } | null;
  /** derived playback files (videos) or the served original (photos), all public URLs */
  web: {
    /** Videos: renditions the source CDN serves directly (media/remote.json). Preferred over local files. */
    remote?: { uhd?: RemoteRendition; fhd?: RemoteRendition; hd?: RemoteRendition };
    poster: string;
    hd?: string; // 1920w H.264
    sd?: string; // 1280w H.264
    scrub?: string; // 1280w all-intra, for scroll-scrubbed playback
    src?: string; // photos: the original, served through next/image
  };
}

export interface MediaSlot {
  /** "<concept>.<scene>.<name>", e.g. "a.s02.aerial" */
  id: string;
  /** Describes the shot this slot needs, shown on its placeholder. */
  needs: string;
  /** Candidate asset ids, in order of preference. The first approved one is used. */
  candidates: string[];
}

export type Approvals = Record<string, AssetStatus>;
