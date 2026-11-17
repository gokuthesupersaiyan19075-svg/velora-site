"use client";

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(SplitText, useGSAP);

export { gsap, SplitText, useGSAP };

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
