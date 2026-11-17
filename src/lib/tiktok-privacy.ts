export const PREFERRED_PRIVACY = "PUBLIC_TO_EVERYONE";
export const SANDBOX_PRIVACY = "SELF_ONLY";
export const PRIVACY_FALLBACK = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

export const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

export function privacyLabel(value: string) {
  return PRIVACY_LABELS[value] ?? value;
}
