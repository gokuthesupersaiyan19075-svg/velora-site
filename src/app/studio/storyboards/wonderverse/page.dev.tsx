import { StoryboardView } from "@/shared/storyboard/StoryboardView";
import { storyboardA } from "@/concepts/a/storyboard";

export const metadata = { title: "Concept A storyboard" };

export default function StoryboardAPage() {
  return <StoryboardView sb={storyboardA} conceptHref="/wonderverse" />;
}
