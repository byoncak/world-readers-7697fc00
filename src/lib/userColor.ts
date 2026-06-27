// Generates a stable HSL accent color from a user ID string
const PALETTE = [
  'hsl(210, 60%, 55%)',  // blue
  'hsl(150, 50%, 45%)',  // green
  'hsl(340, 55%, 55%)',  // rose
  'hsl(270, 45%, 55%)',  // purple
  'hsl(30, 65%, 50%)',   // amber
  'hsl(180, 50%, 45%)',  // teal
  'hsl(0, 55%, 55%)',    // red
  'hsl(45, 60%, 50%)',   // gold
  'hsl(200, 55%, 50%)',  // sky
  'hsl(320, 45%, 50%)',  // magenta
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
