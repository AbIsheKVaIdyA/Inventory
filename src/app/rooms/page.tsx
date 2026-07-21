import type { Metadata } from "next";

import { RoomCollectionForm } from "@/components/RoomCollectionForm";

export const metadata: Metadata = {
  title: "Room information",
  description: "Collect department, building, and room details — no sign-in required.",
};

/** Public share link — no auth. Example: https://your-app.vercel.app/rooms */
export default function RoomsPage() {
  return <RoomCollectionForm />;
}
