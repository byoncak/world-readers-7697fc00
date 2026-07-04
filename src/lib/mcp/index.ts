import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyClubsTool from "./tools/list-my-clubs";
import listClubBooksTool from "./tools/list-club-books";
import getMyProfileTool from "./tools/get-my-profile";
import listMyPersonalBooksTool from "./tools/list-my-personal-books";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "detritivores-mcp",
  title: "Detritivores MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Detritivores book club app. Use `list_my_clubs` to see the user's clubs, `list_club_books` for a club's books, `list_my_personal_books` for the user's personal reading list, and `get_my_profile` for the user's profile and 🍎 balance.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyClubsTool, listClubBooksTool, listMyPersonalBooksTool, getMyProfileTool],
});
