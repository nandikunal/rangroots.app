import { redirect } from "next/navigation";

// Events module has been merged into the unified Calendar & Events page.
// This route is kept so existing links/bookmarks don't 404.
export default function EventsRedirect() {
  redirect("/calendar");
}
