/** The three TikToks to post to: two new ones, plus the original RyvalApp. */
export const TIKTOK_PUBLISH_ACCOUNTS = [
  { id: "6ad1325434d9fdc54190acff", name: "Ryval Sports" },
  { id: "6ad133f38b0dd8294cc724bf", name: "Ryval Sports || Recruting App" },
  { id: "6abe9727a5ec3e563ea0b303", name: "RyvalApp" },
] as const;

/** @ryvalapp2 and @ryvalapp3. RyvalApp stays. */
export const RETIRED_TIKTOK_IDS = new Set([
  "6abc4908fc02e0080c3174e6",
  "6abe96cf0211835ae4f6a762",
]);

/** Two posts per account per Eastern day. Six total across the three accounts. */
export const POSTS_PER_ACCOUNT_PER_DAY = 2;

export function tiktokOnlyAccount(notes: string | null | undefined): string | null {
  const id = notes?.match(/^tiktok_only:(\S+)/m)?.[1]?.trim();
  return id || null;
}

export function withTikTokAccount(notes: string, accountId: string) {
  const base = notes.replace(/^tiktok_only:\S+[ \t]*\n?/m, "").trim();
  return `${base}${base ? "\n" : ""}tiktok_only:${accountId}`;
}
