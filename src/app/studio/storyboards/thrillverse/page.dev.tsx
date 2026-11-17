import { StoryboardView } from "@/shared/storyboard/StoryboardView";
import { storyboardB } from "@/concepts/b/storyboard";

export const metadata = { title: "Concept B storyboard" };

export default function StoryboardBPage() {
  return <StoryboardView sb={storyboardB} conceptHref="/thrillverse" />;
}
