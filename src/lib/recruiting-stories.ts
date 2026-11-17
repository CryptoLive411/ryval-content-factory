import { isSameCarousel, looksLikeSlop } from "@/lib/content-quality";
import type { PhotoGender } from "@/lib/stock-photos";

/** Which account voice a story belongs to. Education can spill when that account is full. */
export type StoryDesk = "ryval" | "education" | "media";
export type StoryKind = "education" | "news" | "data" | "product" | "brand" | "stats";
/** Why the post exists. Used to review a week, not to invent a second catalog. */
export type StoryFamily = "pain" | "example" | "proof" | "news" | "experiment";
export type CloseMode = "product" | "discussion" | "recap";

export type RecruitingStory = {
  /** Stable id. A repeat of this id inside the memory window is a duplicate. */
  id: string;
  kind: StoryKind;
  desk: StoryDesk;
  gender: PhotoGender | "any";
  hook: string;
  hookBody: string;
  slides: { headline: string; body: string }[];
  ctaHeadline: string;
  ctaBody: string;
  screen: string;
  /** Searchable caption. When set, it replaces the cover body as the TikTok description. */
  caption?: string;
  hashtags?: string;
  family?: StoryFamily;
  /** What this post is for when the week is reviewed. */
  objective?: string;
  /** product = do the thing in the app. discussion = a real question. recap = the lesson, light brand. */
  closeMode?: CloseMode;
  sourceUrl?: string;
  /** ISO date the fact was checked. */
  verifiedAt?: string;
  /** ISO date. After this, unattended posting skips the story until someone checks it. */
  reviewAfter?: string;
  /** False means do not publish until the asset or claim is real. */
  ready?: boolean;
  /** First-week slate order. Absent on the evergreen catalog. */
  slateDay?: number;
  slateOrder?: number;
};

/**
 * RyvalApp is the original account and stays the authority voice.
 * Ryval Sports || Recruting App is the player-first education account.
 * Ryval Sports is the broader college soccer account.
 */
/** Old lane titles already posted. Same idea, so the new id stays blocked. */
const LEGACY_TOPIC_IDS: Record<string, string> = {
  "NWSL still buys college minutes": "nwsl-from-college",
  "ECNL still needs openable film": "ecnl-still-needs-film",
  "JUCO second door": "juco-door",
  "How rare D1 is": "how-rare-d1",
  "Homegrown fork vs school path": "homegrown-fork",
  "Transfer portal minutes": "portal-is-not-a-plan",
  "USL is a real second division": "usl-is-a-job",
};

export function canonicalStoryId(topic: string) {
  return LEGACY_TOPIC_IDS[topic] ?? topic;
}

export const DESK_BY_ACCOUNT: Record<string, StoryDesk> = {
  "6abe9727a5ec3e563ea0b303": "ryval",
  "6ad133f38b0dd8294cc724bf": "education",
  "6ad1325434d9fdc54190acff": "media",
};

const EDUCATION = "education" as const;
const RYVAL = "ryval" as const;
const MEDIA = "media" as const;

export const RECRUITING_STORIES: RecruitingStory[] = [
  {
    id: "film-is-not-a-roster-spot",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A coach can like your film and still not recruit you",
    hookBody: "Film answers whether you can play. It does not answer whether they have a spot.",
    slides: [
      {
        headline: "Film only proves you can play",
        body: "A clean first action gets you past the click. That is the whole job of the tape.",
      },
      {
        headline: "Then they open the roster",
        body: "They count who they already have at your position, and what year those players are.",
      },
      {
        headline: "Young depth means no opening",
        body: "Three underclassmen at your spot can close the door even if the coach liked the clip.",
      },
      {
        headline: "Good enough and needed are different",
        body: "Ask both. Can I play this level, and is there a real need for my year?",
      },
    ],
    ctaHeadline: "Check the need before you spend another email",
    ctaBody: "Ryval is where coaches post the roster spot, so you are not guessing from a view on your film.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "count-your-position",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Your dream school may not need your position",
    hookBody: "Here is the check before you write the coach.",
    slides: [
      {
        headline: "Count players at your position",
        body: "Open the current roster and tally only your spot. A deep list is the first answer.",
      },
      {
        headline: "Then read the class years",
        body: "Freshmen and sophomores are staying. Seniors are the ones who create next year's room.",
      },
      {
        headline: "Incoming players are not on it yet",
        body: "Commitments and transfers can fill the opening before you ever send the email.",
      },
    ],
    ctaHeadline: "Stop asking only if you can play there",
    ctaBody: "Ask if they need your profile. Ryval shows the spots coaches posted, not just the campus name.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "email-before-you-have-film",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Most recruiting emails go out before there is anything to watch",
    hookBody: "A coach cannot evaluate a paragraph.",
    slides: [
      {
        headline: "Send the clip, the year, the position",
        body: "Those three are the email. A life story without them goes to the bottom.",
      },
      {
        headline: "One action in the first seconds",
        body: "If the first 15 to 30 seconds are a graphic and a song, they are already gone.",
      },
      {
        headline: "Then say what you want them to see",
        body: "Name the position you want to be recruited as. A mixed tape hides the job.",
      },
    ],
    ctaHeadline: "Put the film where they can reopen it",
    ctaBody: "Ryval keeps that clip, position, and year on one profile instead of a link that dies in an inbox.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "full-match-after-highlights",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "This is why coaches ask for the full match after your highlights",
    hookBody: "A highlight is the best 40 seconds. A match is the other 89 minutes.",
    slides: [
      {
        headline: "Highlights hide the quiet minutes",
        body: "Coaches want the scanning, the lost balls, and what you do when you are not on the ball.",
      },
      {
        headline: "A goal reel is not your job",
        body: "If you are a center back or a keeper, a goal montage answers the wrong question.",
      },
      {
        headline: "Send the game they asked for",
        body: "One full match, position labeled, beats five edited reels with music.",
      },
    ],
    ctaHeadline: "Lead with the clip that matches the position",
    ctaBody: "Ryval files the film by position so a coach is not hunting your job inside a highlight dump.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "follow-is-not-an-offer",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A coach followed you. That does not mean they are recruiting you",
    hookBody: "A follow is attention. An offer is a number, a year, and a spot.",
    slides: [
      {
        headline: "Attention is not a conversation",
        body: "Coaches follow a lot of players at showcases. Most of those follows never become a reply.",
      },
      {
        headline: "Wait for a specific ask",
        body: "A real next step names your position, your year, or a game they want to watch.",
      },
      {
        headline: "Do not build a visit around a follow",
        body: "Until there is a reply about a need, treat it as a view, not a plan.",
      },
    ],
    ctaHeadline: "Look for a posted need, not a follow",
    ctaBody: "Ryval is where a coach can post the spot. That is a clearer signal than a notification.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "two-players-same-talent",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Two equally good players can have completely different recruitments",
    hookBody: "The gap is often the roster, the year, and whether anyone can find the film.",
    slides: [
      {
        headline: "Same ability, different openings",
        body: "One player’s position is graduating. The other’s is full of freshmen. The tape can be equal.",
      },
      {
        headline: "One film is findable",
        body: "The player a coach can reopen on Tuesday gets the evaluation. The Drive link does not.",
      },
      {
        headline: "Fit beats a busier summer",
        body: "More camps do not fix a position a program does not need.",
      },
    ],
    ctaHeadline: "Spend the next hour on fit, not another camp",
    ctaBody: "Ryval puts the film next to the kind of spot a coach is actually posting.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "d1-men-roster-not-9-9",
    kind: "education",
    desk: EDUCATION,
    gender: "men",
    hook: "The old 9.9 cap is not every D1 men's program",
    hookBody: "Schools that opted into the House settlement lost the sport scholarship cap. They gained a roster limit.",
    slides: [
      {
        headline: "Opt-in schools: roster limit 28",
        body: "They may scholarship any player on that roster. They are not required to fund all 28.",
      },
      {
        headline: "28 spots is not 28 full rides",
        body: "Ask what they are actually offering you. A roster spot and a full scholarship are different sentences.",
      },
      {
        headline: "Schools that stayed out keep the old pool",
        body: "A program that did not opt in cannot go above the old 9.9 equivalencies without joining the settlement.",
      },
    ],
    ctaHeadline: "Ask for the percentage before you commit",
    ctaBody: "Ryval helps you find programs posting a real need, so the conversation starts with a spot, not a vibe.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "d1-women-roster-not-14",
    kind: "education",
    desk: EDUCATION,
    gender: "women",
    hook: "14 is the old D1 women's soccer number",
    hookBody: "At schools that opted into the House settlement, that cap is gone. The roster limit is 28.",
    slides: [
      {
        headline: "Opt-in: they can fund the roster",
        body: "Any of the 28 players may receive athletic aid. The school still chooses how much.",
      },
      {
        headline: "A bigger cap did not create a full ride",
        body: "Ask the percentage, and what your family still pays after it.",
      },
      {
        headline: "Non-opt-in schools still use 14",
        body: "If the program did not opt in, it cannot pass the old 14 equivalencies without joining the settlement.",
      },
    ],
    ctaHeadline: "Know the number before you say yes",
    ctaBody: "Ryval shows programs that are actually looking, so the scholarship talk has a roster behind it.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "walk-on-is-not-a-ride",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "We want you is not a scholarship offer",
    hookBody: "A lot of D1 and D2 spots are walk-ons or a small partial.",
    slides: [
      {
        headline: "Ask one number",
        body: "What percentage of a scholarship is this. If they will not say it, you do not have an offer yet.",
      },
      {
        headline: "A walk-on can still be the right room",
        body: "It is a roster spot. It is not a full ride, and it should not be sold as one.",
      },
      {
        headline: "Campus is one market",
        body: "Club and pro doors still exist if the number does not work.",
      },
    ],
    ctaHeadline: "See the need before you chase the phrase",
    ctaBody: "Ryval lets coaches post walk-on and partial needs in the open, instead of a vague we want you.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "d3-no-athletic-aid",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "D3 cannot give you an athletic scholarship",
    hookBody: "Aid at D3 is academic or need-based. The soccer is still real.",
    slides: [
      {
        headline: "No athletic money means ask a different office",
        body: "The coach can want you on the team and still have zero athletic aid to offer.",
      },
      {
        headline: "Academic and need aid are the path",
        body: "That is a financial-aid question, not a playing-time question.",
      },
      {
        headline: "D3 is not a hobby league",
        body: "It is college soccer without an athletic scholarship. Do not let anyone blur those.",
      },
    ],
    ctaHeadline: "Separate the roster spot from the bill",
    ctaBody: "Ryval helps you find the program first. The aid conversation stays with the school, in writing.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "eligibility-clock",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Four seasons in five years is no longer the only clock",
    hookBody: "Division I added an age-based rule. Which one applies depends on when you first enroll.",
    slides: [
      {
        headline: "Fall 2027 enrollees use the new rule",
        body: "It is up to five years. It is not a guaranteed five seasons, and delaying college can start the clock.",
      },
      {
        headline: "The 2026 class gets the better of both",
        body: "If you first enroll full time in 2026-27, the school uses the old rule or the new one, whichever helps you more.",
      },
      {
        headline: "Do not guess the start date",
        body: "The Eligibility Center certifies when your clock starts. A group chat cannot.",
      },
    ],
    ctaHeadline: "Know your clock before you pick a door",
    ctaBody: "Ryval keeps the film ready while you confirm eligibility with the people who actually decide it.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "portal-is-not-a-plan",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Entering the portal is not a recruiting plan",
    hookBody: "Coaches in there are hunting proven college minutes, not another raw highlight.",
    slides: [
      {
        headline: "They want minutes, not a montage",
        body: "Starts and 90s under pressure are the tape. A weekend highlight is what they already skipped.",
      },
      {
        headline: "A list beats a blast",
        body: "Name the programs that need your position and your year. Emailing everyone is not a list.",
      },
      {
        headline: "The portal is crowded on purpose",
        body: "You are one of many. The player they can evaluate in a minute gets the look.",
      },
    ],
    ctaHeadline: "Lead with minutes and one clip they can reopen",
    ctaBody: "Ryval keeps that profile live so a coach is not rebuilding you from five different links.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "visa-is-not-a-scholarship",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A scholarship is not a visa",
    hookBody: "A U.S. college I-20 is a student visa path. A pro club needs different paperwork.",
    slides: [
      {
        headline: "Two doors, two documents",
        body: "An F-1 student visa and a work permit are not the same stamp.",
      },
      {
        headline: "Mixing them costs a year",
        body: "Families lose a season by treating a college offer like a club move, or the other way around.",
      },
      {
        headline: "Name the path first",
        body: "Campus, academy, or pro. Then ask which paper matches that path. This is a map, not legal advice.",
      },
    ],
    ctaHeadline: "Get the film in front of coaches while you sort the paper",
    ctaBody: "Ryval is the profile. The visa question still belongs to the school or the club, not a highlight link.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "camp-invite-is-a-receipt",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A camp invite is a receipt, not an offer",
    hookBody: "You paid to be on a field. That is not a roster spot.",
    slides: [
      {
        headline: "An invite goes to a lot of players",
        body: "If the email did not name a position they need, it is a registration, not a recruitment.",
      },
      {
        headline: "Ask who is actually watching",
        body: "A college coach on the sideline for an hour is not the same as a coach with a need at your spot.",
      },
      {
        headline: "Leave with one clip, not a medal",
        body: "The weekend disappears. The film they can reopen on Monday is the only thing that lasts.",
      },
    ],
    ctaHeadline: "Do not build the summer around another paid look",
    ctaBody: "Ryval keeps the profile after the weekend, which is when a coach would actually follow up.",
    screen: "/app-screens/quick-scout.jpg",
  },
  {
    id: "eligibility-center",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "D1 and D2 coaches cannot use film you never registered",
    hookBody: "For the campus path, the Eligibility Center sits next to the tape.",
    slides: [
      {
        headline: "Core courses and amateurism count",
        body: "On the NCAA campus path, grades and amateur status are part of the evaluation, not a later form.",
      },
      {
        headline: "Unregistered film waits",
        body: "Staffs can like the clip and still leave you in the maybe pile until the paperwork exists.",
      },
      {
        headline: "Pro and overseas is a different door",
        body: "This form is for NCAA campus recruiting. It is not the door to a club contract.",
      },
    ],
    ctaHeadline: "Line the film up with the path you actually want",
    ctaBody: "Ryval holds the film in one place while you finish the campus paperwork with the Eligibility Center.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "keeper-tape",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A save montage is not a goalkeeper tape",
    hookBody: "Keepers are recruited on distribution, starts, and claims. One dive is a highlight.",
    slides: [
      {
        headline: "Outfield showcases hide you",
        body: "You end up in the corner of someone else's clip. Staffs are not scouting that frame.",
      },
      {
        headline: "Show the job, then the save",
        body: "Distribution and command of the box come first. The save is the last clip, not the only one.",
      },
      {
        headline: "Fewer spots, later development",
        body: "Keepers develop later and there are fewer of them on a roster. The tape has to be obviously a keeper.",
      },
    ],
    ctaHeadline: "File yourself as a keeper, not a clip in an outfield reel",
    ctaBody: "Ryval lets a coach filter goalkeepers with keeper film instead of hunting a save in a group tape.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "center-back-late",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A small center back at 16 is not a verdict",
    hookBody: "Center backs often arrive late, as the body catches up. Staffs still need the actual job on film.",
    slides: [
      {
        headline: "Size at U16 is a snapshot",
        body: "It is not the career. Programs that only buy early size miss the late growers.",
      },
      {
        headline: "They still need aerials and the first pass",
        body: "A growth spurt without the defending angles is not a recruitment.",
      },
      {
        headline: "Label the tape as a center back",
        body: "Goals from set pieces hide the job they would actually pay for.",
      },
    ],
    ctaHeadline: "Show the defending, not the growth-spurt myth",
    ctaBody: "Ryval puts that center-back film where a coach looking for the position can find it.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "the-10-creates",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A number 10 is recruited on chances created, not highlight goals",
    hookBody: "If the tape is only finishes, they cannot see the job.",
    slides: [
      {
        headline: "Show the pass before the shot",
        body: "The chance you create is the action. The goal someone else scores can be the result.",
      },
      {
        headline: "Scanning is the clip",
        body: "Staffs want the picture before you receive, not just the touch after.",
      },
      {
        headline: "Do not send a winger reel for a 10",
        body: "1v1 to the byline is a different position. Label the one you want.",
      },
    ],
    ctaHeadline: "Put the creating actions first",
    ctaBody: "Ryval lets you lead the profile with the position you want paid for, not a generic midfielder tag.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "juco-door",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "JUCO is a real door, not a delay",
    hookBody: "NJCAA soccer is how a lot of players get the film, the grades, or the year they did not have.",
    slides: [
      {
        headline: "It is a second start, not a penalty",
        body: "Players use it when the four-year offer, the grades, or the body are not ready yet.",
      },
      {
        headline: "You still need minutes on film",
        body: "A JUCO season only helps if a four-year coach can watch the games, not a badge.",
      },
      {
        headline: "The clock still matters",
        body: "Do not treat the year as free time. Know what it does to eligibility before you enroll.",
      },
    ],
    ctaHeadline: "If JUCO is the plan, make the film easy to send up",
    ctaBody: "Ryval is the profile a four-year coach can open when the JUCO season is actually happening.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "naia-late",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "NAIA often recruits later than D1, and it still counts",
    hookBody: "Later is not lesser. It is a different calendar and real athletic aid.",
    slides: [
      {
        headline: "D1 closing does not close college",
        body: "NAIA programs can still be building the roster when D1 thinks the class is done.",
      },
      {
        headline: "Athletic aid exists here",
        body: "Unlike D3, NAIA can put athletic money on the table. Ask the percentage anyway.",
      },
      {
        headline: "Bring the same film standard",
        body: "A late window is not a reason to send a worse tape.",
      },
    ],
    ctaHeadline: "Look at the late window before you call the class closed",
    ctaBody: "Ryval keeps you findable for the coaches who are still posting needs after the early rush.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "amateurism-trap",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A pro contract is not the same thing as NIL",
    hookBody: "Getting paid for your name is not the same as signing to play as a professional. This is a map, not legal advice.",
    slides: [
      {
        headline: "NIL did not legalize every paycheck",
        body: "A professional playing contract can still affect NCAA eligibility. Ask before you sign.",
      },
      {
        headline: "International players, ask first",
        body: "Clear the contract with the Eligibility Center before a coach falls in love with the film.",
      },
      {
        headline: "Pro is a different door",
        body: "If the path is a club, the campus form is not the one that matters.",
      },
    ],
    ctaHeadline: "Sort eligibility before you shop the film",
    ctaBody: "Ryval gives U.S. coaches the film once you know which door you are actually allowed to knock on.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "graduation-year-in-the-email",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "If the email does not say your graduation year, they cannot use it",
    hookBody: "A coach recruits a class, not a vibe.",
    slides: [
      {
        headline: "The year is the filter",
        body: "They are filling 2027 or 2028 or a transfer class. No year means they cannot file you.",
      },
      {
        headline: "Position is the second filter",
        body: "Midfielder is not a position they can roster. Say the role.",
      },
      {
        headline: "Then one line on what you want",
        body: "A look at a specific game, or a spot you saw on their roster. Not a life story.",
      },
    ],
    ctaHeadline: "Put the year and the position where they cannot miss them",
    ctaBody: "Ryval puts both on the profile, so the email is a pointer, not the whole application.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "how-rare-d1",
    kind: "data",
    desk: MEDIA,
    gender: "any",
    hook: "Most college soccer is not D1",
    hookBody: "Hundreds of thousands play in high school. A thin slice reaches NCAA Division I.",
    slides: [
      {
        headline: "D2, D3, NAIA, and JUCO are the majority",
        body: "Planning as if D1 is the only real college soccer throws away most of the actual rosters.",
      },
      {
        headline: "The level is a fit question",
        body: "Minutes at a level where you play beat a bench at a level you only visited.",
      },
      {
        headline: "Build the list across divisions",
        body: "One dream school and nothing behind it is how a class year disappears.",
      },
    ],
    ctaHeadline: "Search the level where you can actually play",
    ctaBody: "Ryval is not a D1 hype page. Coaches post needs across the paths that really take players.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "usl-is-a-job",
    kind: "education",
    desk: MEDIA,
    gender: "men",
    hook: "USL Championship is a job, not a participation league",
    hookBody: "It is the recognized second tier of men's pro soccer in the U.S.",
    slides: [
      {
        headline: "They hire a position, not a vibe",
        body: "A coach there is filling a roster spot this window. A college senior tape is not automatically that tape.",
      },
      {
        headline: "Show minutes and the role",
        body: "One clip they can reopen beats a season highlight with music.",
      },
      {
        headline: "It is a contract path",
        body: "Travel, film standard, and a job. Do not talk about it like intramurals.",
      },
    ],
    ctaHeadline: "If you want that door, send pro film",
    ctaBody: "Ryval puts the clip in front of staffs posting real needs, including doors that are not campus.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "nwsl-from-college",
    kind: "education",
    desk: MEDIA,
    gender: "women",
    hook: "NWSL still takes a lot of players from college",
    hookBody: "A senior year nobody can watch is a wasted cycle.",
    slides: [
      {
        headline: "Campus film is still a door",
        body: "Youth national teams are one path. Findable college minutes are another.",
      },
      {
        headline: "They grade the game, not the edit",
        body: "Speed of play, 1v1, and end product. A song over goals hides those.",
      },
      {
        headline: "Make the senior tape reopenable",
        body: "If a staff cannot find it in a minute, it does not exist for the draft cycle.",
      },
    ],
    ctaHeadline: "Keep the senior film in one place staffs can share",
    ctaBody: "Ryval is that profile, for college coaches and for anyone above them who asks for the same player.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "college-tape-not-pro",
    kind: "education",
    desk: MEDIA,
    gender: "any",
    hook: "The tape that got you recruited will not get you a pro job",
    hookBody: "College staffs and pro staffs are grading different things.",
    slides: [
      {
        headline: "College tape proves you belong on campus",
        body: "Pro tape proves you can do a specific job, this week, against adults.",
      },
      {
        headline: "Cut the role, not the season",
        body: "Ninety seconds of the position they would pay for beats eight minutes of everything you did.",
      },
      {
        headline: "Say which door you are knocking on",
        body: "Sending the campus reel to a pro coach tells them you do not know the difference yet.",
      },
    ],
    ctaHeadline: "Match the film to the door",
    ctaBody: "Ryval lets you keep one profile and still lead with the clip that fits the coach who is looking.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "mls-next-not-a-plan",
    kind: "education",
    desk: MEDIA,
    gender: "men",
    hook: "A strong MLS Next season is not a college plan",
    hookBody: "Different buyers. Different tape. The league badge does not email the coach for you.",
    slides: [
      {
        headline: "Academy and college recruit differently",
        body: "MLS Next is a development league tied to MLS academies. College coaches are a separate audience.",
      },
      {
        headline: "They still need a clip they can open",
        body: "Being in the league gets you respected. It does not replace a film link with your year and position.",
      },
      {
        headline: "Do not wait for the league to recruit you",
        body: "If the goal is campus, you still have to show the coaches who roster college teams.",
      },
    ],
    ctaHeadline: "Turn the Next season into something a college coach can open",
    ctaBody: "Ryval is the profile those coaches can find, separate from the academy pathway.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "ecnl-still-needs-film",
    kind: "education",
    desk: MEDIA,
    gender: "women",
    hook: "The ECNL badge gets you in the room. The first clip keeps you there",
    hookBody: "Coaches still click off if the opening is not a real action.",
    slides: [
      {
        headline: "The league is the introduction",
        body: "It is not the evaluation. They still have to see you play a job.",
      },
      {
        headline: "First action, then the badge",
        body: "A logo slide and music burns the 15 seconds they were going to give you.",
      },
      {
        headline: "Label the position",
        body: "ECNL on a generic tape does not tell them if you are the fullback they need.",
      },
    ],
    ctaHeadline: "Make the first 20 seconds the position they clicked for",
    ctaBody: "Ryval puts that clip on a profile a college coach can reopen after the ECNL weekend.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "homegrown-fork",
    kind: "education",
    desk: MEDIA,
    gender: "men",
    hook: "Homegrown and college are two roads. Mixing them wastes a year",
    hookBody: "MLS homegrown players can sign with their academy club and skip college. Most players are not on that path.",
    slides: [
      {
        headline: "Know which road you are on",
        body: "If a homegrown contract is real, the college calendar is the wrong plan.",
      },
      {
        headline: "If it is not real, do not wait on it",
        body: "Most U.S. boys still move through club, school, or college. Hoping for the exception is not a class year.",
      },
      {
        headline: "Film the road you chose",
        body: "An academy clip and a college recruiting email are for different buyers.",
      },
    ],
    ctaHeadline: "Pick the door, then build the profile for that door",
    ctaBody: "Ryval is for the path where a coach still has to find you. A signed homegrown deal is a different process.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "superdraft-not-only",
    kind: "education",
    desk: MEDIA,
    gender: "men",
    hook: "Waiting on the MLS SuperDraft is how careers stall",
    hookBody: "It is one intake. Homegrown deals, college free agency, and lower-division minutes move more players.",
    slides: [
      {
        headline: "Draft night is not the only door",
        body: "Most players who end up pro did not get there by sitting still until January.",
      },
      {
        headline: "Minutes in a real league are a path",
        body: "USL and Next Pro are jobs with film standards, not a waiting room.",
      },
      {
        headline: "Be findable before the night",
        body: "A staff that cannot see your last season cannot invent you on draft day.",
      },
    ],
    ctaHeadline: "Get the film in circulation before you circle a date",
    ctaBody: "Ryval keeps that profile available to coaches posting needs, which is most of the actual market.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "womens-pro-ladder",
    kind: "education",
    desk: MEDIA,
    gender: "women",
    hook: "There is a pro ladder under the NWSL, and it wants different film",
    hookBody: "College minutes can move you. They still have to be findable and specific.",
    slides: [
      {
        headline: "NWSL is not the only job",
        body: "The levels under it still sign players. They are jobs, not a consolation bracket.",
      },
      {
        headline: "Send the role they would pay",
        body: "End product, defending the wide areas, or the 10. Pick one and lead with it.",
      },
      {
        headline: "A senior year in a private folder does not travel",
        body: "If the coach under NWSL cannot open it, the ladder cannot see you.",
      },
    ],
    ctaHeadline: "Put the role on a profile both levels can open",
    ctaBody: "Ryval is one profile college staffs and pro staffs can look at without a new link each time.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "uk-permit",
    kind: "education",
    desk: MEDIA,
    gender: "any",
    hook: "A UK club liking your film is not a work permit",
    hookBody: "Talent does not stamp the visa. The club and the governing body do.",
    slides: [
      {
        headline: "The points system is the door",
        body: "A governing-body endorsement is paperwork. It is not a feeling about your highlights.",
      },
      {
        headline: "Ask the club's compliance person",
        body: "An agent's DM is not clearance. This is a map, not legal advice.",
      },
      {
        headline: "Do not book the move first",
        body: "Film can start the conversation. The permit decides if the conversation can become a job.",
      },
    ],
    ctaHeadline: "Be findable so a real club can start a real check",
    ctaBody: "Ryval shows the film and the history. The permit still belongs to the club, not the app.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "pay-to-play",
    kind: "data",
    desk: EDUCATION,
    gender: "any",
    hook: "U.S. club soccer usually charges you to be developed",
    hookBody: "A lot of European academies do the opposite, because the club owns the path.",
    slides: [
      {
        headline: "The invoice is not a ranking",
        body: "Paying more for a club does not mean a college coach is watching.",
      },
      {
        headline: "Ask what the fee buys",
        body: "Games, a coach, and film you can send. A logo and travel, by themselves, are not a recruitment.",
      },
      {
        headline: "Free is not automatically better",
        body: "A free academy only helps if you are actually in the team that gets seen.",
      },
    ],
    ctaHeadline: "Spend on what a coach can watch later",
    ctaBody: "Ryval is where that film lives after the season you already paid for.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "nil-does-not-replace-film",
    kind: "data",
    desk: RYVAL,
    gender: "any",
    hook: "NIL did not change what a coach watches first",
    hookBody: "The pitch got louder. The evaluation is still the film and the roster.",
    slides: [
      {
        headline: "A deal is not a scouting report",
        body: "Followers do not tell a coach if you can defend the box or play the 10.",
      },
      {
        headline: "They still leave if the first action is missing",
        body: "A brand deal does not keep a coach on a clip that never shows the play.",
      },
      {
        headline: "Roster fit still decides",
        body: "NIL does not create a spot at a position they already filled with freshmen.",
      },
    ],
    ctaHeadline: "Get evaluated on the job, not the noise",
    ctaBody: "Ryval is the film and the posted need. The brand conversation can wait until a coach actually wants the player.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "product-posted-need",
    kind: "product",
    desk: RYVAL,
    gender: "any",
    hook: "The useful email is the one answering a need a coach already posted",
    hookBody: "Blind outreach asks a coach to invent a spot. A posted need means the spot exists.",
    slides: [
      {
        headline: "Start from the opening",
        body: "Position, year, and what they said they need. Your email is a reply, not a cold introduction.",
      },
      {
        headline: "Match the film to that ask",
        body: "If they posted a fullback, do not send striker goals.",
      },
      {
        headline: "You can see the market",
        body: "Players, families, and coaches are looking at the same need instead of a private spreadsheet.",
      },
    ],
    ctaHeadline: "See the spots coaches posted",
    ctaBody: "That is what Ryval is for. The opportunity is the post. Your profile is the reply.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "product-one-profile",
    kind: "product",
    desk: RYVAL,
    gender: "any",
    hook: "Five Drive folders is how a coach gives up",
    hookBody: "They will not assemble your recruitment for you.",
    slides: [
      {
        headline: "One profile, one position, one year",
        body: "Film they can reopen. Not a scavenger hunt across chats.",
      },
      {
        headline: "The same link works after the weekend",
        body: "A showcase ends. The profile does not.",
      },
      {
        headline: "Coaches share a link, not a zip file",
        body: "If an assistant cannot forward you in one tap, you are not in the meeting.",
      },
    ],
    ctaHeadline: "Build the one profile they can forward",
    ctaBody: "Ryval is that page. Film, position, and the needs you fit, in the same place.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "product-coach-side",
    kind: "product",
    desk: RYVAL,
    gender: "any",
    hook: "Coaches do not have time to scout an inbox",
    hookBody: "An inbox is not a shortlist. A posted need is.",
    slides: [
      {
        headline: "They already know the position",
        body: "The missing piece is a player they can filter, not 80 emails with no year on them.",
      },
      {
        headline: "Posting the need beats waiting",
        body: "Players who fit can come to the spot. Everyone else stops guessing.",
      },
      {
        headline: "The film is attached",
        body: "No scavenger hunt, no full-match request buried in a thread.",
      },
    ],
    ctaHeadline: "If you coach, post the position you actually need",
    ctaBody: "Ryval is that board. Players apply with film. You are not rebuilding a roster from your inbox.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "brand-one-question",
    kind: "brand",
    desk: RYVAL,
    gender: "any",
    hook: "Stop asking if you can play there",
    hookBody: "Ask if there is a realistic need for your year and your position.",
    slides: [
      {
        headline: "Ability is the first question",
        body: "Fit is the second. Most players only prepare for the first.",
      },
      {
        headline: "The roster is public enough to check",
        body: "Class years, position counts, and who is leaving. Do that before the email.",
      },
      {
        headline: "Then spend the outreach on a real opening",
        body: "One honest need beats ten dream schools that are already full.",
      },
    ],
    ctaHeadline: "Recruit the opening, not the logo",
    ctaBody: "Ryval is being built around players, rosters, and opportunities, so the second question has somewhere to live.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "data-sticker-is-not-the-bill",
    kind: "data",
    desk: RYVAL,
    gender: "any",
    hook: "The scholarship number is not what your family will pay",
    hookBody: "This is an example, not a real school. The method is the point.",
    slides: [
      {
        headline: "Start with the real cost",
        body: "Tuition, housing, and fees. The number on the athletic offer is only one line.",
      },
      {
        headline: "Subtract the aid, then compare",
        body: "A bigger scholarship at a more expensive school can leave you paying more.",
      },
      {
        headline: "Ask for the net, in writing",
        body: "Athletic percentage, academic aid, and what is left. We want you does not answer that.",
      },
    ],
    ctaHeadline: "Get the roster spot and the bill in the same conversation",
    ctaBody: "Ryval helps you find who is actually recruiting your position. The net-cost question still goes to the school, on paper.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "read-a-ranking",
    kind: "news",
    desk: MEDIA,
    gender: "any",
    hook: "A ranking is a result list, not a recruiting list",
    hookBody: "Who is winning does not tell you who is graduating at your position.",
    slides: [
      {
        headline: "The table is last week's games",
        body: "It is useful. It is not a list of programs that need you.",
      },
      {
        headline: "An unbeaten team can be full",
        body: "If your position is all freshmen, the trophy case does not create a spot.",
      },
      {
        headline: "Use the result, then open the roster",
        body: "Class years and incoming commits are the recruiting part of the story.",
      },
    ],
    ctaHeadline: "Do not email a ranking",
    ctaBody: "Email a need. Ryval is where coaches post that need, separate from the scoreboard.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "d2-men-pool-is-9",
    kind: "education",
    desk: EDUCATION,
    gender: "men",
    hook: "D2 men's soccer is still a shared pool of 9",
    hookBody: "The D1 roster change did not move Division II. Nine equivalencies are still split across the team.",
    slides: [
      {
        headline: "9 is the team pool, not 9 full rides",
        body: "NCAA Division II men's soccer can divide those 9 equivalencies however the coach wants.",
      },
      {
        headline: "A partial is the normal offer",
        body: "Ask the percentage, then ask what academic aid can sit next to it.",
      },
      {
        headline: "D1's new cap does not apply here",
        body: "Do not budget a D2 spot as if the school can fund the whole roster.",
      },
    ],
    ctaHeadline: "Get the D2 number before you compare it to D1",
    ctaBody: "Ryval helps you see who is actually posting a need, so the scholarship question has a program attached.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "d2-women-pool-is-9-9",
    kind: "education",
    desk: EDUCATION,
    gender: "women",
    hook: "D2 women's soccer still splits a pool of 9.9",
    hookBody: "That number did not become a roster of full rides. It is still shared.",
    slides: [
      {
        headline: "9.9 is the ceiling for the team",
        body: "NCAA Division II women's soccer divides that pool. Most offers are a share, not the whole thing.",
      },
      {
        headline: "Stack the other aid on paper",
        body: "Academic and need-based aid are separate lines. Ask if they can sit on top of the athletic share.",
      },
      {
        headline: "Do not import the D1 roster story",
        body: "The House roster limit is a Division I rule. This pool is still the D2 rule.",
      },
    ],
    ctaHeadline: "Compare the net, not the division logo",
    ctaBody: "Ryval is where you find the program that needs you. The aid lines still have to come from the school, in writing.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "silence-can-be-the-calendar",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A silent coach is sometimes the recruiting calendar",
    hookBody: "NCAA soccer has contact, quiet, and dead periods. Silence is not always a decision about you.",
    slides: [
      {
        headline: "Dead periods block in-person contact",
        body: "A coach can want you and still be unable to meet, call, or visit under that week's rules.",
      },
      {
        headline: "Check the current soccer calendar",
        body: "The dates move. Guessing the month from last year's post will send you into a wall.",
      },
      {
        headline: "Use the quiet time on the tape",
        body: "If they cannot talk, the thing they can still open later is a clean profile and a full match.",
      },
    ],
    ctaHeadline: "Have the film ready for the week they are allowed to look",
    ctaBody: "Ryval keeps that profile in one place, so the first legal contact is not a scavenger hunt.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "verbal-is-not-signed",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A verbal commitment is not a signed aid agreement",
    hookBody: "Saying yes out loud does not lock the money or the roster spot.",
    slides: [
      {
        headline: "The verbal is a plan, not a contract",
        body: "Either side can change it. Families treat it like a signature. It is not one.",
      },
      {
        headline: "Ask what paper actually exists",
        body: "An aid agreement with a percentage and a year is a different object from a coach saying we want you.",
      },
      {
        headline: "Keep evaluating until that paper is real",
        body: "One verbal should not close every other conversation if nothing is signed.",
      },
    ],
    ctaHeadline: "Keep looking until the offer is on paper",
    ctaBody: "Ryval is where other coaches can still show you a posted need while that verbal is only a verbal.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "aid-year-is-a-question",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Ask whether the athletic aid is for one year",
    hookBody: "A freshman number is not a four-year promise unless the agreement says so.",
    slides: [
      {
        headline: "Read the term on the agreement",
        body: "One year, renewable, is a different budget from aid that is written for more than a year.",
      },
      {
        headline: "Renewal is a decision, not a memory",
        body: "Playing time, grades, and the roster can all change what comes back next year.",
      },
      {
        headline: "Budget the year you can prove",
        body: "If they will not write the later years, do not count them.",
      },
    ],
    ctaHeadline: "Get the year in writing before you plan the degree",
    ctaBody: "Ryval helps you find the roster need. The length of the aid is still a question for the school's paper.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "class-2027-senior-fall",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Class of 2027: the spots left are the job now",
    hookBody: "It is fall of your senior year. Early boards are mostly set. Openings are what is left.",
    slides: [
      {
        headline: "Stop introducing yourself from zero",
        body: "Lead with graduation year 2027, your position, and one link a coach can open today.",
      },
      {
        headline: "Hunt the programs that still have a hole",
        body: "A full recruiting class at your position does not become an offer because the email was polite.",
      },
      {
        headline: "D1 going quiet does not end the list",
        body: "D2, NAIA, and JUCO are still building. Late is a calendar, not an insult.",
      },
    ],
    ctaHeadline: "Spend senior fall on openings, not on logos",
    ctaBody: "Ryval is where a coach posts the spot that is actually open for a 2027.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "class-2028-junior-fall",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Class of 2028: the film has to exist this fall",
    hookBody: "You are a junior. This is the year coaches start a real file, not a maybe.",
    slides: [
      {
        headline: "One full match beats a new montage",
        body: "They need to see you against a real opponent, with the score and the position visible.",
      },
      {
        headline: "Put 2028 in the first line",
        body: "A coach sorting juniors cannot file a profile that never says the year.",
      },
      {
        headline: "Grades travel with the clip",
        body: "Start the Eligibility Center path now if the campus door is the one you want.",
      },
    ],
    ctaHeadline: "Make the junior film easy to reopen",
    ctaBody: "Ryval is one profile: year, position, and the match. Not a new link every weekend.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "class-2029-sophomore-fall",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Class of 2029: a quiet inbox is not a rejection",
    hookBody: "You are a sophomore. A lot of coaches are not allowed, or not ready, to recruit you yet.",
    slides: [
      {
        headline: "Do not fill the year with cold emails",
        body: "Most of those notes cannot be answered usefully yet. They also train you to write noise.",
      },
      {
        headline: "Build tape you will not be embarrassed to send later",
        body: "Full matches from real games. Your position is obvious in the first minute.",
      },
      {
        headline: "Protect the core classes",
        body: "The Eligibility Center will not count every elective. Ask which classes are on the core list.",
      },
    ],
    ctaHeadline: "Use this year to become easy to evaluate later",
    ctaBody: "Ryval can hold the film now, so junior year is not the first time a coach can find you.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "fullback-first-action",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A fullback is judged on the first action under pressure",
    hookBody: "The overlap goal is the clip everyone sends. The first pass is the clip that gets you filed.",
    slides: [
      {
        headline: "Show the ball arriving at you",
        body: "Body shape, the picture you see, and the pass you choose. That is the evaluation.",
      },
      {
        headline: "Defending the 1v1 has to be in the match",
        body: "A reel with no one running at you does not answer whether you can play the spot.",
      },
      {
        headline: "Then the overlap is context",
        body: "It counts after they believe the first action. It does not replace it.",
      },
    ],
    ctaHeadline: "Send the fullback tape a coach can judge in a minute",
    ctaBody: "Ryval puts that match on the profile, next to the position you actually play.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "the-six-screens",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A number 6 is recruited on the screen and the exit pass",
    hookBody: "Goals from 30 yards are not the job. Protecting the middle and playing the first pass is.",
    slides: [
      {
        headline: "Show the defensive action first",
        body: "The step, the body, the duel. If the clip starts at the shot, they learned nothing.",
      },
      {
        headline: "Then show the pass that breaks the line",
        body: "One clean exit under pressure is worth more than a highlight of an empty goal.",
      },
      {
        headline: "Say you are a 6",
        body: "If the email says midfielder, they cannot tell whether you are the 6, the 8, or the 10.",
      },
    ],
    ctaHeadline: "Label the 6 and show the two actions",
    ctaBody: "Ryval is the profile where the position and the match stay attached.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "the-nine-finishes",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A number 9 is recruited on the chance they finish",
    hookBody: "A skills reel does not show whether the shot came from a real entry.",
    slides: [
      {
        headline: "Start the clip at the pass into you",
        body: "The touch, the defender, and the decision. The goal is the last frame, not the only frame.",
      },
      {
        headline: "Misses in the box still count",
        body: "Coaches are counting chances. A montage that hides the misses hides the job.",
      },
      {
        headline: "Hold-up is part of the position",
        body: "If you only show runs in behind, they do not know if you can be the 9 when the ball is at your feet.",
      },
    ],
    ctaHeadline: "Send the chances, not a trick reel",
    ctaBody: "Ryval keeps the full match next to the position, so the 9 tape is the game.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "winger-entry",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A winger is recruited on the entry, not the cone drill",
    hookBody: "They want the ball into the box as a cross or a shot, from a real game.",
    slides: [
      {
        headline: "Show the 1v1 that starts the entry",
        body: "If nobody is goalside of you, it is not the action they are recruiting.",
      },
      {
        headline: "End product is the cross or the shot",
        body: "A cut inside that dies is information. A reel that cuts away before it is not.",
      },
      {
        headline: "Say which side",
        body: "Left, right, or both. A coach with one wing to fill cannot use a vague wide player.",
      },
    ],
    ctaHeadline: "Put the side and the match where they can see both",
    ctaBody: "Ryval is the profile that keeps the wing you play next to the film of it.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "i20-comes-from-the-school",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "The I-20 comes from the school, not a coach's message",
    hookBody: "A coach can want you and still not be the office that issues the student visa form.",
    slides: [
      {
        headline: "Admission and the I-20 are school offices",
        body: "International athletes need that form from the institution. A recruiting DM is not it.",
      },
      {
        headline: "A scholarship does not skip the form",
        body: "Money and the visa paper are separate. Families lose months treating them as one yes.",
      },
      {
        headline: "Ask who sends the document",
        body: "If the answer is not the international office, you do not have the paper yet.",
      },
    ],
    ctaHeadline: "Get the film to coaches while the school handles the form",
    ctaBody: "Ryval is the profile. The I-20 still comes from the school, not from the app.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "core-gpa-not-school-gpa",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Your school GPA is not the Eligibility Center number",
    hookBody: "They calculate from core courses. Electives that lift your GPA may not be in that math.",
    slides: [
      {
        headline: "Ask which classes are core",
        body: "The list is specific. A high overall GPA can still hide a thin core record.",
      },
      {
        headline: "Fix the list early",
        body: "Senior year is a hard time to discover a class you needed never counted.",
      },
      {
        headline: "The coach cannot waive it",
        body: "Interest in your film does not replace the core-course record.",
      },
    ],
    ctaHeadline: "Check the core list before you plan the offer",
    ctaBody: "Ryval carries the film. The Eligibility Center is still the office that certifies the classes.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "two-markets",
    kind: "data",
    desk: MEDIA,
    gender: "any",
    hook: "Men's and women's college soccer are two different markets",
    hookBody: "Different rosters, different coaches, different aid rules. A mixed post helps nobody.",
    slides: [
      {
        headline: "The roster you study has to be your sport",
        body: "A men's depth chart does not tell a woman where the opening is, or the reverse.",
      },
      {
        headline: "The aid rules are not copies",
        body: "Division II is the clear example: men's soccer is a pool of 9, women's is 9.9.",
      },
      {
        headline: "Say which sport in the first line",
        body: "If the email does not, the staff that receives it may be the wrong one.",
      },
    ],
    ctaHeadline: "Search the sport you actually play",
    ctaBody: "Ryval keeps men's and women's opportunities apart, so the need you open is yours.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "verbal-does-not-freeze-the-position",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Your verbal does not close that position",
    hookBody: "The coach can keep recruiting your spot after you say yes.",
    slides: [
      {
        headline: "A verbal is not a locked roster line",
        body: "Until there is paper, and often after it, they are still allowed to look.",
      },
      {
        headline: "Ask how many they are still taking",
        body: "One yes from you does not mean they stopped calling your position.",
      },
      {
        headline: "You should keep a second list too",
        body: "If they are still recruiting, you are allowed to keep understanding your other options.",
      },
    ],
    ctaHeadline: "Know who else is being recruited at your spot",
    ctaBody: "Ryval shows posted needs, so a verbal is not the only signal you have.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "subject-line-is-the-file",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "If the subject line hides your year, the email is skipped",
    hookBody: "They file a class and a position. A clever subject does not file you.",
    slides: [
      {
        headline: "Year, position, one fact",
        body: "2028 center back, starter, one link. That is a subject a staff can sort.",
      },
      {
        headline: "The link has to open",
        body: "A Drive folder with twelve files is where the evaluation stops.",
      },
      {
        headline: "Write it only if you checked the need",
        body: "A perfect subject sent to a full position is still a wasted note.",
      },
    ],
    ctaHeadline: "Send the note when the need is real",
    ctaBody: "Ryval is where that need is posted, so the subject line is answering something.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "official-vs-unofficial",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "An unofficial visit is your trip. An official visit is theirs",
    hookBody: "Who pays is the difference. A campus tour you bought is not an offer.",
    slides: [
      {
        headline: "Unofficial: your family pays",
        body: "You can often go, within the calendar. It is not the school recruiting you with their budget.",
      },
      {
        headline: "Official: the school pays, and the rules are tighter",
        body: "There are limits on when and how many. Being invited is interest. It is still not a scholarship.",
      },
      {
        headline: "Ask which kind before you book",
        body: "If they did not say official, do not assume they are covering it.",
      },
    ],
    ctaHeadline: "Spend the trip on a program that has a need",
    ctaBody: "Ryval helps you check the opening before you buy a flight for a visit that is not an offer.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "pressure-or-they-stop",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Coaches stop the clip when the pressure is fake",
    hookBody: "Cones, empty goals, and a teammate rolling the ball in are not a recruiting tape.",
    slides: [
      {
        headline: "The defender has to be in the frame",
        body: "If the action has no opponent, they cannot judge the decision.",
      },
      {
        headline: "Leave the scoreboard context in",
        body: "A chance in a real match tells them the level. A setup does not.",
      },
      {
        headline: "One honest minute beats a long trick reel",
        body: "They are deciding whether to keep watching. Give them the game.",
      },
    ],
    ctaHeadline: "Put a real match where they can press play",
    ctaBody: "Ryval is the profile for that film, not a folder of training clips.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "title-is-not-a-need",
    kind: "education",
    desk: MEDIA,
    gender: "any",
    hook: "A conference title does not mean they need your position",
    hookBody: "Winning and roster space are different questions. Check the class years anyway.",
    slides: [
      {
        headline: "The trophy is about the players already there",
        body: "It says the current group is good. It does not say someone at your spot is leaving.",
      },
      {
        headline: "Open the roster after you celebrate the result",
        body: "Count your position. Read the years. Then look at incoming commits.",
      },
      {
        headline: "Email the need, not the headline",
        body: "Congrats on the title is not a recruiting email.",
      },
    ],
    ctaHeadline: "Use the result as a reason to check the roster",
    ctaBody: "Ryval is where a coach posts the need the title cannot tell you.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "new-coach-does-not-inherit-verbals",
    kind: "education",
    desk: MEDIA,
    gender: "any",
    hook: "A new head coach does not inherit every verbal",
    hookBody: "The last staff's yes can evaporate. The new staff recruits the roster they want.",
    slides: [
      {
        headline: "Ask the new staff directly",
        body: "A commitment made to the old coach is a conversation, not a guaranteed spot.",
      },
      {
        headline: "Your film has to stand without the relationship",
        body: "They did not watch you last fall. Send the match, the year, and the position again.",
      },
      {
        headline: "It can also open a door",
        body: "A coach who wants a different profile may need your position for the first time.",
      },
    ],
    ctaHeadline: "Reintroduce yourself when the staff changes",
    ctaBody: "Ryval keeps the film in one profile, so you are not rebuilding the email from scratch.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "one-link-only",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "Five links is how a coach closes the tab",
    hookBody: "They will not assemble your career from a thread. One profile, one match.",
    slides: [
      {
        headline: "Pick the match before you hit send",
        body: "The best 90, or the best 20 minutes inside it. Not every game you liked.",
      },
      {
        headline: "Put the position on that same page",
        body: "If they have to infer where you play, they move on.",
      },
      {
        headline: "Update the link. Do not add a sixth",
        body: "A new weekend replaces the old one. It does not become another attachment.",
      },
    ],
    ctaHeadline: "Keep one profile current",
    ctaBody: "Ryval is that page: position, year, and the match they can reopen.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "foreign-transcript",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "A foreign transcript still has to be certified",
    hookBody: "A grade sheet from home is not automatically an Eligibility Center record.",
    slides: [
      {
        headline: "Start the certification early",
        body: "International documents take longer than a U.S. transcript upload. Do not wait for a coach to ask.",
      },
      {
        headline: "The coach cannot convert the grades",
        body: "Interest in your film does not certify the academics.",
      },
      {
        headline: "Campus and a pro contract are still different files",
        body: "This step is for the NCAA path. A club does not use it.",
      },
    ],
    ctaHeadline: "Get the record certified while the film is already watchable",
    ctaBody: "Ryval holds the film for U.S. coaches. The Eligibility Center still has to certify the transcript.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "assistant-watches-first",
    kind: "education",
    desk: EDUCATION,
    gender: "any",
    hook: "The head coach is often not the person who watches first",
    hookBody: "An assistant or a director of operations opens the inbox. Write for them.",
    slides: [
      {
        headline: "Make the first minute staff-proof",
        body: "Year, position, and a match that starts with a real action. They are sorting, not scouting a movie.",
      },
      {
        headline: "Find the person who owns your position",
        body: "A note to the wrong coach is how a useful player never gets filed.",
      },
      {
        headline: "Do not wait for the head coach to follow you",
        body: "A follow is not the evaluation. The evaluation is someone opening the match.",
      },
    ],
    ctaHeadline: "Make the profile obvious to whoever opens it",
    ctaBody: "Ryval puts the position and the film on one page, so the first viewer does not need the head coach in the room.",
    screen: "/app-screens/quick-scout.jpg",
  },
];

const GENERIC_HOOK =
  /^(?:\d+\s+)?(?:recruiting advice|recruiting tips|how to get recruited|things college coaches look for|5 things)\b/i;

export function storyPassesGate(story: RecruitingStory): boolean {
  const hookWords = story.hook.trim().split(/\s+/).filter(Boolean);
  if (hookWords.length < 4 || hookWords.length > 16) return false;
  if (GENERIC_HOOK.test(story.hook) || looksLikeSlop(story.hook)) return false;
  if (!story.ctaHeadline.trim() || !story.ctaBody.trim()) return false;
  if (story.slides.length > 4) return false;
  for (const slide of story.slides) {
    if (!slide.headline.trim() || !slide.body.trim()) return false;
    if (slide.headline.trim().toLowerCase() === story.hook.trim().toLowerCase()) return false;
  }
  const blob = [story.hook, story.hookBody, ...story.slides.map((s) => `${s.headline} ${s.body}`)].join(" ");
  if (looksLikeSlop(blob)) return false;
  return true;
}

function ageOf(id: string, recentIdsNewestFirst: string[]) {
  const index = recentIdsNewestFirst.indexOf(id);
  return index === -1 ? 10_000 : index;
}

/**
 * Pick one story the account has not already told.
 * Same id or a near-duplicate hook inside the memory window is rejected.
 * If every story was used, the least recently used hook that is not a near-duplicate of the last two weeks still goes, so the daily volume does not stop.
 */
export function pickRecruitingStory(opts: {
  desk: StoryDesk;
  gender: "men" | "women";
  recentHooks: string[];
  recentIds: string[];
}): RecruitingStory {
  const blocked = new Set(opts.recentIds.slice(0, 12));
  const genderOk = (story: RecruitingStory) => story.gender === "any" || story.gender === opts.gender;
  const freshHook = (story: RecruitingStory) => !isSameCarousel(story.hook, opts.recentHooks);
  const base = RECRUITING_STORIES.filter(
    (story) => storyPassesGate(story) && genderOk(story) && !blocked.has(story.id),
  );

  const unused = base.filter((story) => freshHook(story) && !opts.recentIds.includes(story.id));
  const forDesk = unused.filter((story) => story.desk === opts.desk);
  const education = unused.filter((story) => story.kind === "education");
  const pool = forDesk.length ? forDesk : education.length ? education : unused;

  const ranked = (pool.length ? pool : base.filter(freshHook)).slice();
  ranked.sort((a, b) => ageOf(b.id, opts.recentIds) - ageOf(a.id, opts.recentIds));
  const pick = ranked[0];
  if (pick) return pick;

  const twoWeeksHooks = opts.recentHooks.slice(0, 24 * 14);
  const twoWeeksIds = opts.recentIds.slice(0, 24 * 14);
  const reusable = base
    .filter((story) => !twoWeeksIds.includes(story.id) && !isSameCarousel(story.hook, twoWeeksHooks))
    .sort((a, b) => ageOf(b.id, opts.recentIds) - ageOf(a.id, opts.recentIds));
  if (reusable[0]) return reusable[0];

  // The catalog is smaller than two weeks of posts. Rotate the least recently
  // used story that is outside the most recent full pass, so one hook is not repeated every hour.
  const recentCycle = new Set(opts.recentIds.slice(0, Math.max(1, base.length)));
  const nextInCycle = base
    .filter((story) => !recentCycle.has(story.id))
    .sort((a, b) => ageOf(b.id, opts.recentIds) - ageOf(a.id, opts.recentIds));
  if (nextInCycle[0]) return nextInCycle[0];

  const oldest =
    [...base].sort((a, b) => ageOf(b.id, opts.recentIds) - ageOf(a.id, opts.recentIds))[0] ??
    RECRUITING_STORIES.find((story) => storyPassesGate(story));
  if (!oldest) throw new Error("No recruiting story passed the quality gate");
  return oldest;
}

export function newsStoryFromRecord(opts: {
  sport: "men" | "women";
  team: string;
  record: string;
  losses: number;
}): RecruitingStory {
  const side = opts.sport === "women" ? "Women's" : "Men's";
  const unbeaten = opts.losses === 0;
  const shortName = opts.team.trim().split(/\s+/).slice(0, 3).join(" ");
  const fits = (text: string) => text.trim().split(/\s+/).filter(Boolean).length <= 16;
  const full = unbeaten
    ? `${side} ${opts.team} still hasn't lost. That is not a roster opening`
    : `${side} ${opts.team} is ${opts.record}. A record is not a roster need`;
  const shorter = unbeaten
    ? `${side} ${shortName} hasn't lost. That is not an opening`
    : `${side} ${shortName} is ${opts.record}. Check the roster`;
  const hook = fits(full) ? full : fits(shorter) ? shorter : `${shortName} is ${opts.record}. Check the roster`;
  return {
    id: `news-${opts.sport}-${opts.team.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    kind: "news",
    desk: MEDIA,
    gender: opts.sport,
    hook,
    hookBody: `NCAA Division I ${opts.sport}'s soccer: ${opts.team} is ${opts.record} this season.`,
    slides: [
      {
        headline: "The result is not the recruitment",
        body: "A record says who has been winning games. It does not say who is leaving at your position.",
      },
      {
        headline: "Open the class years",
        body: "If your spot is full of freshmen and sophomores, this start does not create a place for you.",
      },
      {
        headline: "Then ask the real question",
        body: "Not whether they are good. Whether they need your year and your position.",
      },
    ],
    ctaHeadline: "Do not email a scoreline",
    ctaBody: "Ryval is where a coach posts the need. The scoreboard will not do that for you.",
    screen: "/app-screens/discover.jpg",
  };
}
