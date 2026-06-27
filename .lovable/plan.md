**Replace the home-page journal card with four icon-only nav buttons.**

**1. Home page — icon row**
In `src/pages/Index.tsx`, remove the current single "Quotes, reviews, and notes" card. Replace it with a horizontal row of four circular icon-only buttons (no labels). Each button links to its corresponding destination.

| Icon | Destination |
|---|---|
| `StickyNote` (post-it) | `/journal?tab=notes` |
| `Star` | `/journal?tab=ratings` |
| `Feather` (quill) | `/journal?tab=quotes` |
| `Send` (paper plane) | `/lounge?tab=messages` |

Styling: circular buttons with subtle background, spaced evenly. Hover/active state with primary color.

**2. Journal — URL-driven tab switching**
In `src/pages/Journal.tsx`, switch from `useState` to `useSearchParams`. Read the `tab` query parameter so that `/journal?tab=notes`, `/journal?tab=ratings`, and `/journal?tab=quotes` land on the correct tab. Update the indicator position logic to use the search-param-driven active tab. Keep the animated underline indicator behavior unchanged.

**3. Community / Inbox**
The Community page already supports `?tab=messages`, so the DM icon can link directly to `/lounge?tab=messages`. No changes needed there.