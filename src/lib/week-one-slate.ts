import { isSameCarousel } from "@/lib/content-quality";
import {
  storyPassesGate,
  type RecruitingStory,
  type StoryDesk,
} from "@/lib/recruiting-stories";

/**
 * First-week slate from the Oct 15, 2026 editorial plan.
 * Two posts per desk per day, in this order. The evergreen catalog is the fallback
 * after these are used. Unverified founder claims and invented outcomes are not in here.
 */
export const WEEK_ONE_SLATE: RecruitingStory[] = [
  // —— Education ——
  {
    id: "w1-edu-silence",
    kind: "education",
    family: "pain",
    desk: "education",
    gender: "men",
    slateDay: 1,
    slateOrder: 1,
    objective: "Profile visits",
    closeMode: "product",
    hook: "No reply does not mean no talent",
    hookBody: "Before you judge your ability, check what the coach actually has to evaluate.",
    caption:
      "College soccer recruiting: a quiet inbox does not explain why a coach has not replied. Make your next introduction clearer with current details and film.",
    slides: [
      {
        headline: "Can they place you?",
        body: "Make your position, graduation year, current team, and contact details easy to find.",
      },
      {
        headline: "Can they see your game?",
        body: "Include current film that shows your role. Make it clear which player you are.",
      },
      {
        headline: "Did you choose a fit?",
        body: "Research the program and explain your interest. A roster suggests questions. It does not confirm an opening.",
      },
    ],
    ctaHeadline: "Make your next introduction easier",
    ctaBody: "Build your Ryval profile and add your current film before the next message.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-edu-net-cost",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "women",
    slateDay: 1,
    slateOrder: 2,
    objective: "Saves and shares",
    closeMode: "recap",
    hook: "A bigger scholarship can cost you more",
    hookBody: "Compare what you pay after aid. These are illustrative annual totals, not actual offers.",
    caption:
      "Soccer scholarships: compare the annual cost after all aid, not just the size of the award. Illustrative numbers only. Your actual package will differ.",
    slides: [
      {
        headline: "Example A: $30,000 left to pay",
        body: "An illustrative $60,000 annual cost minus $30,000 in aid leaves $30,000. This is not a real school.",
      },
      {
        headline: "Example B: $20,000 left to pay",
        body: "An illustrative $35,000 annual cost minus $15,000 in aid leaves $20,000. The smaller award costs $10,000 less here.",
      },
    ],
    ctaHeadline: "Ask for the cost after all aid",
    ctaBody: "Get the full annual cost and the written aid from each school. Ryval does not calculate your bill.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "w1-edu-email-example",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "men",
    slateDay: 2,
    slateOrder: 1,
    objective: "Saves",
    closeMode: "recap",
    hook: "This email gives a coach something to answer",
    hookBody: "A fictional example. Not a real coach's inbox, and not a promise they will reply.",
    caption:
      "College soccer recruiting email: one specific question is easier to answer than a paragraph about your dream.",
    hashtags: "#collegesoccer #soccerrecruiting #ryval",
    slides: [
      {
        headline: "The example, labeled as fake",
        body: "Subject: 2027 center back, full match from October. Body: I am a 2027 center back at a club in Texas. Are you recruiting that spot for 2027?",
      },
      {
        headline: "One question, then stop",
        body: "Year, position, and where the film is. Do not ask them to assemble your career from five links.",
      },
    ],
    ctaHeadline: "Send one clear question",
    ctaBody: "Put the year and the film on your Ryval profile so the email does not have to carry the whole file.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-edu-id-camp",
    kind: "education",
    family: "pain",
    desk: "education",
    gender: "men",
    slateDay: 2,
    slateOrder: 2,
    objective: "Shares",
    closeMode: "recap",
    hook: "Before you pay for that ID camp",
    hookBody: "An invite means you may attend. It does not mean they are selecting you.",
    caption:
      "College soccer ID camp: decide from the staff who will be there, the position they need, and what the fee costs your family.",
    slides: [
      {
        headline: "Ask who is actually on the sideline",
        body: "A college coach for an hour is not the same as the coach who recruits your position.",
      },
      {
        headline: "Then price the fee",
        body: "If the staff you need will not be there, the camp is a receipt. Spend the money only if that trade is worth it.",
      },
    ],
    ctaHeadline: "Go for a reason you can name",
    ctaBody: "Ryval is where a posted need can tell you the position. The camp fee is still your decision.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    id: "w1-edu-first-clip",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "women",
    slateDay: 3,
    slateOrder: 1,
    objective: "Film activation",
    closeMode: "product",
    hook: "Your first clip should show your role",
    hookBody: "Open on the action you are actually being recruited to play, not a random goal.",
    caption:
      "Women's soccer recruiting film: the first clip should show your role so a coach does not have to guess which player you are.",
    slides: [
      {
        headline: "Name the job in the first action",
        body: "A fullback's first clip is the first ball under pressure. A nine's is the run and the finish. A keeper's is the decision, not only the dive.",
      },
      {
        headline: "Mark which player you are",
        body: "Jersey number, position, and the match date. A coach should not have to find you in the frame.",
      },
    ],
    ctaHeadline: "Put that clip on your profile",
    ctaBody: "Add the current film to your Ryval profile so the next introduction starts on your role.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-edu-senior-may-return",
    kind: "education",
    family: "news",
    desk: "education",
    gender: "men",
    slateDay: 3,
    slateOrder: 2,
    objective: "Saves",
    closeMode: "recap",
    sourceUrl: "https://www.ncaa.org/eligibility-center/division-i-and-division-ii-age-based-eligibility-rules/",
    verifiedAt: "2026-10-15",
    reviewAfter: "2026-11-15",
    hook: "A senior on the roster may return",
    hookBody: "A class label is not a certification that the player is done.",
    caption:
      "College soccer roster research: a senior label does not tell you whether that player has eligibility left. Confirm it before you count an opening.",
    slides: [
      {
        headline: "Class year is not the clock",
        body: "Division I and II eligibility depends on the rule that applies to that athlete. A roster line cannot certify it.",
      },
      {
        headline: "Do not invent the vacancy",
        body: "Counting seniors is a research start. It is not a list of open spots. Ask the staff what they are recruiting.",
      },
    ],
    ctaHeadline: "Ask before you count the spot",
    ctaBody: "Use your Ryval profile to introduce your year and position, then confirm the need with the program.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "w1-edu-stop-resend",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "men",
    slateDay: 4,
    slateOrder: 1,
    objective: "Saves",
    closeMode: "recap",
    hook: "Stop resending the exact same recruiting email",
    hookBody: "A second copy of the same paragraph gives a coach nothing new to open.",
    caption:
      "College soccer recruiting email: a follow-up needs a new match, a new date, or a real question. Resending the same note does not.",
    slides: [
      {
        headline: "The repeat asks them to remember you",
        body: "If the film, the year, and the question are unchanged, you are asking for a second look at the same file.",
      },
      {
        headline: "The update gives them a reason",
        body: "A new match date, a new clip of your role, or an answer to something they asked. That is a different email.",
      },
    ],
    ctaHeadline: "Send the new piece, not the old note",
    ctaBody: "Add the new film to your Ryval profile, then point the email at that update.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-edu-ask-before-aid",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "women",
    slateDay: 4,
    slateOrder: 2,
    objective: "Shares",
    closeMode: "recap",
    hook: "Ask this before accepting a soccer scholarship",
    hookBody: "The award size is not the amount your family will pay.",
    caption:
      "Soccer scholarship cost: before you accept, ask what you pay for the year after aid, and what has to stay true for that aid to return.",
    slides: [
      {
        headline: "What is left after all aid?",
        body: "Athletic aid, academic aid, housing, and fees. One number on an athletic letter can hide the rest.",
      },
      {
        headline: "What makes it come back next year?",
        body: "Ask whether the aid is for one year and what the agreement says about renewal. A verbal is not that paper.",
      },
    ],
    ctaHeadline: "Get the net on paper",
    ctaBody: "Ryval can show you the program. The cost after aid still has to come from the school, in writing.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "w1-edu-resume-context",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "men",
    slateDay: 5,
    slateOrder: 1,
    objective: "Profile activation",
    closeMode: "product",
    hook: "Your soccer resume is missing the context",
    hookBody: "A stat line without the level, the dates, and the role is a number with nowhere to sit.",
    caption:
      "Soccer recruiting profile: put the competition level, the dates, and your role next to the stats so a coach can read them.",
    slides: [
      {
        headline: "An example, not a real player",
        body: "Eight goals in 2025 means little until it says which league, which team, and whether you were the nine or a wide player arriving late.",
      },
      {
        headline: "Add the three lines",
        body: "Competition level. Month and year. The role you actually played. Then the stat can be compared.",
      },
    ],
    ctaHeadline: "Put the context on the profile",
    ctaBody: "Add your position, team, and year on your Ryval profile before you send the stat line alone.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-edu-reply-not-offer",
    kind: "education",
    family: "pain",
    desk: "education",
    gender: "men",
    slateDay: 5,
    slateOrder: 2,
    objective: "Saves",
    closeMode: "recap",
    hook: "5 reasons a reply is not an offer",
    hookBody: "Thanks for the film feels good. It is not a scholarship.",
    caption:
      "College soccer: a coach reply is not an offer. Assumption's posted CAM need names the year and the GPA. A thank-you email does not.",
    slides: [
      {
        headline: "They did not say money",
        body: "No aid number means no offer.",
      },
      {
        headline: "They did not say a year",
        body: "We will watch is not a class year.",
      },
      {
        headline: "They did not say a spot",
        body: "A nice note is not a roster spot.",
      },
      {
        headline: "A real need writes the rules",
        body: "Assumption's card says class of 2027, GPA 3.6, and SAT 1260.",
      },
    ],
    ctaHeadline: "Read the card before you celebrate",
    ctaBody: "Open that need in Ryval. Apply only if the year and the GPA are yours.",
    screen: "/app-screens/need-assumption-cam.png",
  },
  {
    id: "w1-edu-enrollment-year",
    kind: "education",
    family: "news",
    desk: "education",
    gender: "women",
    slateDay: 6,
    slateOrder: 1,
    objective: "Shares",
    closeMode: "recap",
    sourceUrl: "https://www.ncaa.org/eligibility-center/division-i-and-division-ii-age-based-eligibility-rules/",
    verifiedAt: "2026-10-15",
    reviewAfter: "2026-11-15",
    hook: "5 reasons the same year is not the same door",
    hookBody: "Both needs say class of 2027. The GPA on the card is different.",
    caption:
      "College soccer: UAB's striker need says GPA 2.9. Assumption's mid need says GPA 3.6 and SAT 1260. Same class year. Read the card in Ryval.",
    slides: [
      {
        headline: "UAB's striker card says 2.9",
        body: "Class of 2027. That is the bar on that card.",
      },
      {
        headline: "Assumption's mid card says 3.6",
        body: "Same class year. Also a 1260 SAT.",
      },
      {
        headline: "Same year. Different job.",
        body: "Striker is not attacking mid. Read the position.",
      },
      {
        headline: "If the number is not you, don't apply",
        body: "A 2.9 player is a match for one card. Not the other.",
      },
    ],
    ctaHeadline: "Open the card. Read the number.",
    ctaBody: "Then apply in Ryval only if the year, the position, and the GPA are yours.",
    screen: "/app-screens/need-uab-striker.png",
  },
  {
    id: "w1-edu-real-update",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "men",
    slateDay: 6,
    slateOrder: 2,
    objective: "Saves",
    closeMode: "product",
    hook: "5 reasons just checking in gets deleted",
    hookBody: "If nothing is new, they will not reread the old email.",
    caption: "Soccer follow-up: say the new film, or name the job they posted. Dayton wants a central mid for 2027.",
    slides: [
      { headline: "Hello is not news", body: "They already have the old email." },
      { headline: "Say what changed", body: "A new match. A new date. One fact." },
      { headline: "Name their job", body: "Dayton posted central mid. Class of 2027." },
      { headline: "Say the GPA if it matches", body: "Their card says 3.2. If that is you, write it." },
    ],
    ctaHeadline: "Add the new clip on Ryval",
    ctaBody: "Then open the Dayton need and apply only if you match it.",
    screen: "/app-screens/need-dayton-cm.png",
  },
  {
    id: "w1-edu-compare-fees",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "men",
    slateDay: 7,
    slateOrder: 1,
    objective: "Shares",
    closeMode: "recap",
    hook: "5 reasons a bigger scholarship can cost more",
    hookBody: "These numbers are an example. Not a real school.",
    caption: "Soccer scholarships: a bigger award at a pricey school can leave your family paying more. Ask for the cost after aid.",
    slides: [
      { headline: "Look at the whole bill", body: "School cost. Not just the sports money." },
      { headline: "Example A leaves $30,000", body: "$60,000 cost minus $30,000 aid. Example only." },
      { headline: "Example B leaves $20,000", body: "$35,000 cost minus $15,000 aid." },
      { headline: "The smaller award costs less", body: "In this example, $10,000 less to pay." },
    ],
    ctaHeadline: "Ask the school for the real bill",
    ctaBody: "Ryval does not do the math. It shows you the program. The cost comes from the school, on paper.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "w1-edu-club-coach",
    kind: "education",
    family: "example",
    desk: "education",
    gender: "women",
    slateDay: 7,
    slateOrder: 2,
    objective: "Profile activation",
    closeMode: "product",
    hook: "Your club coach cannot introduce a blank profile",
    hookBody: "If they have to explain your year, your position, and where the film is, the introduction dies.",
    caption:
      "Soccer recruiting: Lynn posted a central midfielder need for the class of 2027, minimum GPA 3.2. Your club coach can forward that match. They cannot invent the profile.",
    slides: [
      {
        headline: "Give them three lines",
        body: "Position, graduation year, and one film link. This is a template, not a real player's bio. Anything longer does not get forwarded.",
      },
      {
        headline: "Then point at a real need",
        body: "Anthony Desperito posted Lynn's central mid need. Class of 2027. GPA 3.2. If that is you, the intro can name that card.",
      },
    ],
    ctaHeadline: "Make the profile the thing they forward",
    ctaBody: "Fill the year, the position, and the film on Ryval, then open the Lynn need.",
    screen: "/app-screens/need-lynn-cm.png",
  },

  // —— Media ——
  {
    id: "w1-media-d1-or-d2",
    kind: "education",
    family: "pain",
    desk: "media",
    gender: "men",
    slateDay: 1,
    slateOrder: 1,
    objective: "Substantive comments",
    closeMode: "discussion",
    hook: "Would you take D1 bench or D2 minutes?",
    hookBody: "A hypothetical choice. The division label does not answer every question about your future.",
    caption:
      "D1 versus D2 soccer: the useful debate is about fit, development, and cost. Playing time is never guaranteed. What would decide it for you?",
    slides: [
      {
        headline: "Ask what development would look like",
        body: "Compare coaching, training, and the competition for your position. Playing time can change. Neither option is a promise.",
      },
      {
        headline: "Compare life outside soccer too",
        body: "Check academics, total cost, and location. Would you choose the school if soccer stopped?",
      },
    ],
    ctaHeadline: "What would change your answer?",
    ctaBody: "Which option would you choose, and what would you need to know first? Ryval is a place to look. It does not pick for you.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "w1-media-four-seniors",
    kind: "education",
    family: "example",
    desk: "media",
    gender: "men",
    slateDay: 1,
    slateOrder: 2,
    objective: "Shares",
    closeMode: "product",
    hook: "Four seniors do not mean four openings",
    hookBody: "A roster can help you research a program. It cannot confirm what that program needs next.",
    caption:
      "College soccer roster research should give you better questions, not an invented list of vacancies. Confirm recruiting needs with the staff.",
    slides: [
      {
        headline: "Class year does not settle eligibility",
        body: "A roster label alone does not tell you whether a player can return. Do not guess a remaining season off the word senior.",
      },
      {
        headline: "The next roster is still changing",
        body: "Returning players, incoming recruits, and transfers can change the picture. Ask the staff what they are recruiting for.",
      },
    ],
    ctaHeadline: "Ask about your year and position",
    ctaBody: "Introduce yourself with current details and film on your Ryval profile, then verify the need with the program.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    id: "w1-media-midfield-film",
    kind: "education",
    family: "example",
    desk: "media",
    gender: "women",
    slateDay: 2,
    slateOrder: 1,
    objective: "Saves and film activation",
    closeMode: "product",
    hook: "Midfielders: your goals do not show everything",
    hookBody: "Show what happens when you receive, scan, and make the next decision.",
    caption:
      "Midfielder recruiting film: your goals are one part of your game. Give the viewer enough context to understand the decisions around the ball.",
    hashtags: "#collegesoccer #soccerrecruiting #ryval",
    slides: [
      {
        headline: "Show the moment before receiving",
        body: "Include enough of the picture to see your positioning and the pressure around you. A cropped goal leaves that out.",
      },
      {
        headline: "Keep the next action in view",
        body: "A turn, a pass, or a recovery can show something a goal montage never includes. This is presentation, not a claim that every coach watches the same way.",
      },
    ],
    ctaHeadline: "Give your film more context",
    ctaBody: "Add current film to your Ryval profile that represents how you play, not only how you finish.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-media-famous-school",
    kind: "education",
    family: "pain",
    desk: "media",
    gender: "men",
    slateDay: 2,
    slateOrder: 2,
    objective: "Shares",
    closeMode: "discussion",
    hook: "A famous school can still be the wrong fit",
    hookBody: "The logo does not answer cost, academics, or whether they need your role.",
    caption:
      "College soccer fit: a big program can still be wrong if the cost, the classroom, or the role does not match you.",
    slides: [
      {
        headline: "One mismatch is enough to pause",
        body: "A school you cannot afford, a major they do not offer, or a position they already filled with younger players. Pick the one that is true.",
      },
      {
        headline: "The name does not fix that",
        body: "Wanting the sweatshirt is not a recruiting plan. The useful question is whether you would go if the soccer got worse.",
      },
    ],
    ctaHeadline: "Name the mismatch before you chase it",
    ctaBody: "Look up the program on Ryval, then decide if the role and the cost still make sense.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "w1-media-winger-entry",
    kind: "education",
    family: "example",
    desk: "media",
    gender: "men",
    slateDay: 3,
    slateOrder: 1,
    objective: "Saves",
    closeMode: "product",
    hook: "Wingers: show the moment before the assist",
    hookBody: "The pass is the result. The timing and the starting position are the evaluation.",
    caption:
      "Winger recruiting film: show where you received, how you attacked the space, and the decision before the final ball.",
    slides: [
      {
        headline: "Start wide enough to see the choice",
        body: "If the clip begins at the cross, the coach missed whether you were on, inside, or late.",
      },
      {
        headline: "Keep the decision in the frame",
        body: "A cross, a cut-back, or a pass into the box. One of those, with the pressure still visible, says more than the cone drill.",
      },
    ],
    ctaHeadline: "Add the action before the assist",
    ctaBody: "Put that clip on your Ryval profile so the film matches the role you say you play.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-media-choose-program",
    kind: "education",
    family: "experiment",
    desk: "media",
    gender: "women",
    slateDay: 3,
    slateOrder: 2,
    objective: "Comments",
    closeMode: "discussion",
    hook: "What would make you choose this program?",
    hookBody: "A hypothetical. One tradeoff, not a real offer and not a guaranteed role.",
    caption:
      "Women's college soccer: if a program offered minutes and a harder academic load, what would you need to know before you said yes?",
    slides: [
      {
        headline: "The tradeoff in this example",
        body: "More time on the field at a school whose major is not your first choice. Playing time is still not promised. The classroom is.",
      },
      {
        headline: "Your answer needs a reason",
        body: "Cost, the major, the level of training, or how far you would live from home. Pick the one that would actually move you.",
      },
    ],
    ctaHeadline: "What would you need to know first?",
    ctaBody: "Say which fact would decide it. Ryval can show you programs. It cannot make the choice.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "w1-media-keeper-context",
    kind: "education",
    family: "example",
    desk: "media",
    gender: "men",
    slateDay: 4,
    slateOrder: 1,
    objective: "Saves",
    closeMode: "product",
    hook: "Goalkeepers need more than a saves montage",
    hookBody: "The dive is one action. The distribution and the decision before the shot are the rest of the position.",
    caption:
      "Goalkeeper recruiting film: add the pass after the save, or the claim you do not make, so the clip is the position and not only the dive.",
    slides: [
      {
        headline: "Show the choice, not only the catch",
        body: "A punch, a claim, or a save that stays with you. Then the next pass. A coach recruiting a keeper is watching that sequence.",
      },
      {
        headline: "Date it and mark yourself",
        body: "Match, year, and the jersey. A montage of unnamed dives does not tell them which season they are watching.",
      },
    ],
    ctaHeadline: "Add the sequence, not just the dive",
    ctaBody: "Put a current keeper clip on your Ryval profile that includes the decision after the ball arrives.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-media-ranking-limit",
    kind: "education",
    family: "news",
    desk: "media",
    gender: "men",
    slateDay: 4,
    slateOrder: 2,
    objective: "Relevant reach",
    closeMode: "recap",
    hook: "The ranking does not answer your recruiting question",
    hookBody: "A poll can tell you who has been winning. It cannot tell you who is leaving at your position.",
    caption:
      "College soccer rankings: a results list is not a list of roster openings. Ask what the ranking cannot tell you before you email the logo.",
    slides: [
      {
        headline: "It records games, not needs",
        body: "Wins, losses, and a place in a poll. None of those lines say they are recruiting your year.",
      },
      {
        headline: "The question is still the roster",
        body: "Class years, incoming players, and the position they posted. If they did not post it, you do not know it.",
      },
    ],
    ctaHeadline: "Use the result as a reason to look",
    ctaBody: "Ryval is where a coach can post the need. The ranking will not do that for you.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "w1-media-record-not-role",
    kind: "education",
    family: "news",
    desk: "media",
    gender: "women",
    slateDay: 5,
    slateOrder: 1,
    objective: "Relevant reach",
    closeMode: "recap",
    hook: "A winning record cannot promise your role",
    hookBody: "Results say who has been winning games. They do not say the team needs your position.",
    caption:
      "Women's college soccer: a strong record is a results fact. Your role, your year, and an actual opening are a different question.",
    slides: [
      {
        headline: "Separate the two facts",
        body: "A record can be checked on the team's schedule. A recruiting need cannot be inferred from it.",
      },
      {
        headline: "Do not email the scoreboard",
        body: "Congratulating a win is not an introduction. Your year, your position, and your film are.",
      },
    ],
    ctaHeadline: "Introduce the player, not the headline",
    ctaBody: "Put your film and year on your Ryval profile. Then ask the staff if they need that role.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-media-center-back",
    kind: "education",
    family: "example",
    desk: "media",
    gender: "men",
    slateDay: 5,
    slateOrder: 2,
    objective: "Saves",
    closeMode: "product",
    hook: "Centre backs: show the decision after the tackle",
    hookBody: "Winning the ball is half the clip. The next pass or the recovery shape is the other half.",
    caption:
      "Center back recruiting film: keep the next pass in the clip so a coach can see the decision, not only the tackle.",
    slides: [
      {
        headline: "Stay with the play",
        body: "If you cut the moment you win it, the coach never sees whether you played out or put it in the stands.",
      },
      {
        headline: "One sequence is enough",
        body: "Pressure, the tackle or the interception, then the exit pass. Date the match and mark your number.",
      },
    ],
    ctaHeadline: "Add the pass after the win",
    ctaBody: "Put that sequence on your Ryval profile. A tackle montage without the next action is incomplete.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-media-move-farther",
    kind: "education",
    family: "pain",
    desk: "media",
    gender: "men",
    slateDay: 6,
    slateOrder: 1,
    objective: "Comments",
    closeMode: "discussion",
    hook: "Would you move farther for a better fit?",
    hookBody: "A hypothetical. Distance, the role, and the total cost. Not a real offer.",
    caption:
      "College soccer decisions: would a better role and a higher total cost, farther from home, be worth it? Playing time is not guaranteed.",
    slides: [
      {
        headline: "The example on the table",
        body: "A closer school where your position looks full, or a farther school where the role is a better match and the bill is higher.",
      },
      {
        headline: "Name what would decide it",
        body: "The major, the net cost, or how often you could get home. If you cannot name it, you are choosing the logo.",
      },
    ],
    ctaHeadline: "What would you refuse to trade?",
    ctaBody: "Answer that before you chase the farther school. Ryval can help you look. It does not move you.",
    screen: "/app-screens/discover.jpg",
  },
  {
    id: "w1-media-transfer-half",
    kind: "education",
    family: "pain",
    desk: "media",
    gender: "women",
    slateDay: 6,
    slateOrder: 2,
    objective: "Shares",
    closeMode: "recap",
    hook: "A transfer destination is only half the story",
    hookBody: "A labeled hypothetical. Not a real player's move, and not a promise you would play.",
    caption:
      "College soccer transfer: the new school is only useful if the role, the cost, and the eligibility still make sense for you.",
    slides: [
      {
        headline: "The destination is not the decision",
        body: "In this example, a player could move to a bigger conference and still sit, pay more, or start the eligibility question over.",
      },
      {
        headline: "Ask the same three things",
        body: "What role is actually being discussed. What the family would pay. Whether eligibility allows the season you think you are getting.",
      },
    ],
    ctaHeadline: "Decide the fit before the announcement",
    ctaBody: "Your Ryval profile is the introduction. The portal is not a plan, and a logo is not a role.",
    screen: "/app-screens/university.jpg",
  },
  {
    id: "w1-media-another-path",
    kind: "education",
    family: "news",
    desk: "media",
    gender: "men",
    slateDay: 7,
    slateOrder: 1,
    objective: "Shares",
    closeMode: "recap",
    hook: "5 reasons 8 seniors is not 8 open spots",
    hookBody: "Swipe. The roster number is not the job they posted.",
    caption:
      "College soccer rosters: Assumption lists 8 seniors and only 2 players marked leaving. The open need is a central attacking mid. See it in Ryval.",
    slides: [
      {
        headline: "A year is not an empty seat",
        body: "Senior on a list does not mean that player is gone.",
      },
      {
        headline: "Only 2 are marked leaving",
        body: "The app tags 2 players. Not all 8 seniors.",
      },
      {
        headline: "Those 2 are grads",
        body: "One is a defender. One is a forward. Not every spot.",
      },
      {
        headline: "The job posted is attacking mid",
        body: "That is the need. Not any senior. Not a defender.",
      },
    ],
    ctaHeadline: "Open the roster. Then read the need.",
    ctaBody: "Both are in Ryval. The list starts the question. The posting says the job.",
    screen: "/app-screens/roster-assumption.png",
  },
  {
    id: "w1-media-which-clip",
    kind: "education",
    family: "experiment",
    desk: "media",
    gender: "men",
    slateDay: 7,
    slateOrder: 2,
    objective: "Comments and saves",
    closeMode: "discussion",
    hook: "5 reasons coaches skip your film",
    hookBody: "A pretty goal is not enough. They need to see the play.",
    caption:
      "Soccer film: coaches skip a goal with no defender. Longwood posted a keeper need for the class of 2027. Show the pass after the save.",
    slides: [
      {
        headline: "The goal had no defender",
        body: "They learned you can score a gift. Not how you play.",
      },
      {
        headline: "They can't see your number",
        body: "Mark who you are. Jersey number. Position.",
      },
      {
        headline: "The clip has no date",
        body: "Last year and this month are not the same tape.",
      },
      {
        headline: "A keeper job wants the next pass",
        body: "Longwood wants a goalkeeper for 2027. A dive with no pass does not answer it.",
      },
    ],
    ctaHeadline: "Put one clear clip on Ryval",
    ctaBody: "Then open the Longwood keeper need. Apply only if that is your position and your year.",
    screen: "/app-screens/need-longwood-gk.png",
  },

  // —— Ryval ——
  {
    id: "w1-ryval-find-the-film",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "women",
    slateDay: 1,
    slateOrder: 1,
    objective: "Downloads and film activation",
    closeMode: "product",
    hook: "Stop making coaches search for your film",
    hookBody: "Your next introduction should make your player details and current footage easy to find.",
    caption:
      "A soccer recruiting profile is more useful when the player information and current film are in one place. This is the Ryval profile, not a promise a coach has opened it.",
    slides: [
      {
        headline: "Start with the player details",
        body: "Position, current team, and graduation year. Those fields are on the profile. Keep them accurate.",
      },
      {
        headline: "Add film that shows your role",
        body: "The film lives on the same profile. Mark who you are in the clip. This does not send itself to every coach.",
      },
    ],
    ctaHeadline: "Put the introduction in one place",
    ctaBody: "Create your Ryval profile and add your current film. A coach still has to choose to look.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-ryval-same-stats",
    kind: "education",
    family: "example",
    desk: "ryval",
    gender: "men",
    slateDay: 1,
    slateOrder: 2,
    objective: "Saves",
    closeMode: "recap",
    hook: "Two players, same stats, different context",
    hookBody: "A labeled example. Not two real recruits, and not a prediction of who gets offered.",
    caption:
      "Soccer recruiting stats: the same goal number can hide a different league, a different role, and a different month. Context is the part a coach can use.",
    slides: [
      {
        headline: "The numbers match on purpose",
        body: "Both examples show eight goals. One is a nine in a regional league this fall. The other is a winger in a higher league last spring.",
      },
      {
        headline: "What the number leaves out",
        body: "Role, competition, and date. Without those, the stat cannot tell a coach whether the player fits the need.",
      },
    ],
    ctaHeadline: "Put the context next to the number",
    ctaBody: "Your Ryval profile has a place for the position, the team, and the film. The stat still needs those lines.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-ryval-current-film",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "men",
    slateDay: 2,
    slateOrder: 1,
    objective: "Film activation",
    closeMode: "product",
    hook: "Your next introduction starts with current film",
    hookBody: "The film on the profile should be this season, and it should show your role.",
    caption:
      "Soccer recruiting film: add a current clip to your Ryval profile before you send the next introduction. Posting it does not guarantee a coach will watch.",
    slides: [
      {
        headline: "Open the film on your profile",
        body: "The reel is part of the player profile, next to your position and year. Use a match from this season.",
      },
      {
        headline: "Say which player and which action",
        body: "Jersey number and the role. A coach should not have to hunt you, and the app does not do that hunt for them.",
      },
    ],
    ctaHeadline: "Add the clip before you write",
    ctaBody: "Put current film on your Ryval profile, then send the introduction. Watching it is still the coach's choice.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-ryval-profile-before-after",
    kind: "education",
    family: "example",
    desk: "ryval",
    gender: "women",
    slateDay: 2,
    slateOrder: 2,
    objective: "Trust and activation",
    closeMode: "product",
    hook: "What to fix on the profile before you write",
    hookBody: "A labeled example of a thin profile and a usable one. Not a real player, and not a coach's reaction.",
    caption:
      "Soccer recruiting profile: year, position, team, and current film are the pieces a coach can use. This example does not claim anyone got recruited.",
    slides: [
      {
        headline: "The thin version",
        body: "A first name, no graduation year, no team, and a highlight with no number. A coach cannot place that player.",
      },
      {
        headline: "The usable version",
        body: "Year, position, current team, and one match that shows the role. Still no promise anyone replies.",
      },
    ],
    ctaHeadline: "Fix those fields before the email",
    ctaBody: "Fill them on your Ryval profile. That is the introduction. It is not a result.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-ryval-one-question",
    kind: "education",
    family: "example",
    desk: "ryval",
    gender: "men",
    slateDay: 3,
    slateOrder: 1,
    objective: "Saves",
    closeMode: "recap",
    hook: "This message makes the next step clear",
    hookBody: "A fictional introduction. One player, one question. Not a real coach email.",
    caption:
      "College soccer recruiting message: introduce the year and the position, ask one question, and point at the film. Do not ask them to build the file.",
    slides: [
      {
        headline: "The example note",
        body: "I am a 2028 fullback. Here is a full match from September. Are you recruiting a fullback in that class? That is the whole note.",
      },
      {
        headline: "Stop after the question",
        body: "No life story. No five links. If they need more, they can ask. If they do not reply, you still do not know why.",
      },
    ],
    ctaHeadline: "Keep the film behind that question",
    ctaBody: "The match belongs on your Ryval profile so the note can stay as short as the example.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-ryval-match-update",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "men",
    slateDay: 3,
    slateOrder: 2,
    objective: "Film activation",
    closeMode: "product",
    hook: "Turn this match into a useful recruiting update",
    hookBody: "A new match is an update only if the film and the date are where a coach can find them.",
    caption:
      "Soccer recruiting update: add the new match to your Ryval film, with the date and your role, instead of writing that you played.",
    slides: [
      {
        headline: "The clip is the update",
        body: "Open the film on your profile and add the match. Position and date stay next to it. The app does not email coaches for you.",
      },
      {
        headline: "Then the note can be one line",
        body: "New full match from Saturday, I am number 4. That sentence works because the film is already there.",
      },
    ],
    ctaHeadline: "Add the match, then tell them",
    ctaBody: "Update the film on your Ryval profile first. A sentence with nowhere to click is not an update.",
    screen: "/app-screens/reel.jpg",
  },
  {
    id: "w1-ryval-first-session",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "women",
    slateDay: 4,
    slateOrder: 1,
    objective: "Downloads and activation",
    closeMode: "product",
    hook: "What happens after you join Ryval?",
    hookBody: "The first useful session is a profile a coach could actually read. Not a tour of every button.",
    caption:
      "Ryval for soccer players: after you join, add your position, year, team, and current film. That is the first session. It does not recruit you by itself.",
    slides: [
      {
        headline: "The profile comes first",
        body: "Position, graduation year, and current team. Those are the fields that place you. Leave them blank and the film has no player attached.",
      },
      {
        headline: "Then one current clip",
        body: "Add film that shows your role and mark who you are. Stop there. You can apply to a posted need after that, if one is actually posted.",
      },
    ],
    ctaHeadline: "Finish that before you message anyone",
    ctaBody: "Create the Ryval profile, add the film, and only then send an introduction.",
    screen: "/app-screens/profile.jpg",
  },
  {
    id: "w1-ryval-rule-is-not-yours",
    kind: "education",
    family: "news",
    desk: "ryval",
    gender: "men",
    slateDay: 4,
    slateOrder: 2,
    objective: "Saves",
    closeMode: "product",
    hook: "5 reasons coaches don't answer your email",
    hookBody: "Swipe. Each reason is short. The last slide is the fix.",
    caption:
      "College soccer recruiting email: coaches skip notes with no position, no year, and too many film links. Put those on one Ryval profile.",
    slides: [
      {
        headline: "They don't know your position",
        body: "Say striker, keeper, or mid. If you don't, they can't place you.",
      },
      {
        headline: "They don't know your year",
        body: "Class of 2027 and class of 2028 are different jobs. Write the year.",
      },
      {
        headline: "Your film is too many links",
        body: "Five links is a pile. They will not build it. Send one clip.",
      },
      {
        headline: "You didn't name their job",
        body: "They posted a need. Your email talked about their school instead.",
      },
    ],
    ctaHeadline: "Put it on one Ryval profile",
    ctaBody: "Add your position, your year, and one film. Then apply to a need a coach already posted.",
    screen: "/app-screens/need-liberty-am.png",
  },
  {
    id: "w1-ryval-intro-to-copy",
    kind: "education",
    family: "example",
    desk: "ryval",
    gender: "men",
    slateDay: 5,
    slateOrder: 1,
    objective: "Saves",
    closeMode: "recap",
    hook: "5 reasons I love your program fails",
    hookBody: "They already wrote the job. Your email should copy it.",
    caption:
      "College soccer email: Liberty posted an attacking mid need for the class of 2027, GPA 3.0. Quote that. Don't open with I love your program.",
    slides: [
      {
        headline: "They already wrote the job",
        body: "The need is on Ryval. Read it first.",
      },
      {
        headline: "Liberty wants an attacking mid",
        body: "Men's soccer. Class of 2027. That is the role.",
      },
      {
        headline: "The card says GPA 3.0",
        body: "If that is not you, this is not your job.",
      },
      {
        headline: "Your email should use their words",
        body: "I am a 2027 attacking mid. Here is one film. Are you still recruiting that role?",
      },
    ],
    ctaHeadline: "Quote their need. Then apply.",
    ctaBody: "Open the Liberty posting in Ryval. Send it only if the year and the GPA are yours.",
    screen: "/app-screens/need-liberty-am.png",
  },
  {
    id: "w1-ryval-complete-profile",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "women",
    slateDay: 5,
    slateOrder: 2,
    objective: "Profile completion",
    closeMode: "product",
    hook: "The coach posted a GPA. Your profile has none.",
    hookBody: "Lynn's central mid need says class of 2027 and minimum GPA 3.2. A profile without those fields cannot answer it.",
    caption:
      "Ryval player profile: coaches are posting the year and the GPA on the need. If your profile is missing both, you are asking them to guess.",
    slides: [
      {
        headline: "The card already has the test",
        body: "Anthony Desperito posted it for Lynn men's soccer. Central midfielder. Class of 2027. Minimum GPA 3.2.",
      },
      {
        headline: "Your page has to survive that test",
        body: "Position, graduation year, and a clip of the role. Completing it does not mean they watched you. Leaving it blank means they cannot.",
      },
    ],
    ctaHeadline: "Fill the fields the need is asking for",
    ctaBody: "Do it on your Ryval profile, then open the Lynn posting and apply only if you match.",
    screen: "/app-screens/need-lynn-cm.png",
  },
  {
    id: "w1-ryval-one-link",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "men",
    slateDay: 6,
    slateOrder: 1,
    objective: "Trust and profile visits",
    closeMode: "product",
    hook: "Five links is why they never saw the film",
    hookBody: "A highlight, a Hudl, a Drive folder, and two more. The coach does not assemble that.",
    caption:
      "Soccer recruiting: one Ryval profile holds the year, the position, and the film. Five links ask the coach to build your career for you.",
    slides: [
      {
        headline: "The pile is the problem",
        body: "A highlight, a full match, a Hudl, a Drive folder, and a second account. Most coaches will not open all of them.",
      },
      {
        headline: "The profile is the replacement",
        body: "Position, year, team, and current film in one place. You still send it. It does not distribute itself.",
      },
    ],
    ctaHeadline: "Send one link that holds the file",
    ctaBody: "Build that on your Ryval profile. Leave the five-link email in the drafts.",
    screen: "/app-screens/feed-live.jpg",
  },
  {
    id: "w1-ryval-read-the-need",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "men",
    slateDay: 6,
    slateOrder: 2,
    objective: "Qualified activation",
    closeMode: "product",
    hook: "Dayton wants a central mid. Not your favorite logo.",
    hookBody: "Dillon Nino posted it. Class of 2027. Minimum GPA 3.2. If that is not you, do not apply to be polite.",
    caption:
      "College soccer recruiting: Dayton's posted need is a central midfielder for the class of 2027, minimum GPA 3.2. Read it before you apply.",
    slides: [
      {
        headline: "The card is the requirement list",
        body: "Central midfielder. University of Dayton men's soccer. Class of 2027. GPA 3.2. A striker who loves the school still does not match it.",
      },
      {
        headline: "Your profile has to answer the card",
        body: "Year, position, and film of that role. An empty profile is an application with nothing on it. Applying does not create a spot.",
      },
    ],
    ctaHeadline: "Read it, then apply if you match",
    ctaBody: "Open the Dayton need in Ryval. If the year or the GPA is not yours, pick a different card.",
    screen: "/app-screens/need-dayton-cm.png",
  },
  {
    id: "w1-ryval-build-today",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "women",
    slateDay: 7,
    slateOrder: 1,
    objective: "Downloads and activation",
    closeMode: "product",
    hook: "Evangel posted a keeper need. Are you one?",
    hookBody: "Samuel Winning posted it for Evangel men's soccer. Class of 2027. Minimum GPA 3.0.",
    caption:
      "Soccer recruiting profile: Evangel's posted need is a goalkeeper for the class of 2027, minimum GPA 3.0. Your profile should already say if that is you.",
    slides: [
      {
        headline: "The need names the role",
        body: "Goalkeeper. Class of 2027. GPA 3.0. If your profile says forward, this card is not your application.",
      },
      {
        headline: "Then the clip has to be a keeper",
        body: "Distribution, the claim, the next pass. A field-player highlight does not answer a goalkeeper posting.",
      },
    ],
    ctaHeadline: "Match the profile to the card",
    ctaBody: "Set your position and film on Ryval, then open the Evangel need and apply only if you are that keeper.",
    screen: "/app-screens/need-evangel-gk.png",
  },
  {
    id: "w1-ryval-coach-view",
    kind: "product",
    family: "proof",
    desk: "ryval",
    gender: "men",
    slateDay: 7,
    slateOrder: 2,
    objective: "Downloads and activation",
    closeMode: "product",
    hook: "They see who applied. Not the whole internet.",
    hookBody: "A posted need collects the players who applied to it. It does not broadcast you to every coach.",
    caption:
      "Ryval: a coach who posted a need can open the players who applied. Posting a profile does not put you in front of a staff that never received an application.",
    slides: [
      {
        headline: "The list is the applicants",
        body: "They opened a need. Players applied. That is the pile they can actually sort. Your film is what is on the profile they open.",
      },
      {
        headline: "Silence is not a viewing",
        body: "If you never applied to their posting, you are not in that list. Do not read a quiet inbox as a review of your talent.",
      },
    ],
    ctaHeadline: "Apply to the need they posted",
    ctaBody: "Complete your Ryval profile, then apply where the year and the position match. That is how you get into the list.",
    screen: "/app-screens/opportunities-live.png",
  },
];

function storyIsReady(story: RecruitingStory, now: number) {
  if (story.ready === false) return false;
  if (story.reviewAfter && Date.parse(story.reviewAfter) <= now) return false;
  return true;
}

/** Next unused first-week story for this desk. Gender comes from the brief, not the global turn. */
export function pickWeekOneStory(opts: {
  desk: StoryDesk;
  recentIds: string[];
  recentHooks: string[];
  now?: number;
}): RecruitingStory | null {
  const now = opts.now ?? Date.now();
  const used = new Set(opts.recentIds);
  const next = WEEK_ONE_SLATE.filter(
    (story) =>
      story.desk === opts.desk &&
      storyIsReady(story, now) &&
      !used.has(story.id) &&
      storyPassesGate(story) &&
      !isSameCarousel(story.hook, opts.recentHooks),
  ).sort(
    (a, b) =>
      (a.slateDay ?? 0) - (b.slateDay ?? 0) || (a.slateOrder ?? 0) - (b.slateOrder ?? 0),
  );
  return next[0] ?? null;
}
