import type { PhotoGender } from "@/lib/stock-photos";

export type PersonaGender = PhotoGender | "any";
export type PersonaLens = "players" | "parents" | "coaches";

export type Persona = {
  who: string;
  pain: string;
  gender: PersonaGender;
  lens: PersonaLens;
};

export const PERSONAS: Persona[] = [
  {
    who: "MLS Next / academy boy",
    pain: "club says 'the path is here' but no one shows the next door after U17",
    gender: "men",
    lens: "players",
  },
  {
    who: "ECNL / girls academy player",
    pain: "fewer evaluators, more pay-to-play, film still sits in a group chat",
    gender: "women",
    lens: "players",
  },
  {
    who: "high school player (boys)",
    pain: "no exposure, coaches never open the long tape, lost in showcase noise",
    gender: "men",
    lens: "players",
  },
  {
    who: "high school player (girls)",
    pain: "smaller scout circuit, harder to get evaluated on the same film standard",
    gender: "women",
    lens: "players",
  },
  {
    who: "college player hunting a pro trial",
    pain: "minutes on campus, zero idea who is actually watching seniors",
    gender: "any",
    lens: "players",
  },
  {
    who: "JUCO / transfer player",
    pain: "tight timeline, limited contacts, fighting the late-bloomer label",
    gender: "any",
    lens: "players",
  },
  {
    who: "international player targeting Europe",
    pain: "agents vanish, trials are vague, no club can see a real profile",
    gender: "any",
    lens: "players",
  },
  {
    who: "international player considering US college",
    pain: "no US film, visa + amateurism maze, coaches want a package not a WhatsApp",
    gender: "any",
    lens: "players",
  },
  {
    who: "Latin American club player",
    pain: "local ladder is real, but the next country has no way to find you",
    gender: "any",
    lens: "players",
  },
  {
    who: "African player looking for a legal club move",
    pain: "too many middlemen, not enough verified coaches, paperwork kills deals",
    gender: "any",
    lens: "players",
  },
  {
    who: "goalkeeper who gets ignored at outfield showcases",
    pain: "one saved clip in an 8-minute tape, no GK-specific look",
    gender: "any",
    lens: "players",
  },
  {
    who: "soccer parent paying club + travel",
    pain: "thousands a year, zero clarity on which events move a career",
    gender: "any",
    lens: "parents",
  },
  {
    who: "parent of a daughter in the women's game",
    pain: "same spend as the boys, thinner scout traffic, scared of empty showcases",
    gender: "women",
    lens: "parents",
  },
  {
    who: "parent comparing college vs academy vs pro trial",
    pain: "three sales pitches, no map of what each path actually costs",
    gender: "any",
    lens: "parents",
  },
  {
    who: "college coach (NCAA / NAIA)",
    pain: "inbox is spam film, recruiting budget is tiny, can't see real roster fits",
    gender: "any",
    lens: "coaches",
  },
  {
    who: "USL / pro coach scouting globally",
    pain: "need a specific profile this month, not another unsolicited reel",
    gender: "any",
    lens: "coaches",
  },
  {
    who: "club coach / DOC",
    pain: "players ask for help; no time to chase every college, club, or trial",
    gender: "any",
    lens: "coaches",
  },
  {
    who: "overseas academy scout",
    pain: "can fly once a year; needs players who are findable before the ticket",
    gender: "any",
    lens: "coaches",
  },
  {
    who: "former player turned trainer",
    pain: "great kids being missed because nobody packaged the story or the film",
    gender: "any",
    lens: "coaches",
  },
];

export type FactLane = {
  topic: string;
  gender: PhotoGender | "any";
  audience: PersonaLens | "any";
  fact: string;
  beats: string[];
  match: string[];
  solution: string;
  coachSolution: string;
  screen: string;
};

export const FACT_LANES: FactLane[] = [
  // ── College is one pathway (keep some, not most) ──
  {
    topic: "D1 men's scholarship pool",
    gender: "men",
    audience: "players",
    fact: "NCAA Division I men's soccer is an equivalency sport: 9.9 scholarships are shared across the whole roster (often ~28–32 players). It is not 9.9 full rides.",
    beats: [
      "D1 men share 9.9 scholarships across the whole roster.",
      "Most rosters are 28–32 players. Almost nobody gets 100%.",
      "'We want you' is not a full ride. Ask the percentage.",
      "Get the scholarship % in writing before you commit.",
    ],
    match: ["9.9 scholarships", "equivalency sport", "scholarship percentage"],
    solution: "Ryval shows which programs still have roster spots at your position.",
    coachSolution: "Ryval lets coaches post real roster needs instead of drowning in spam film.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    topic: "D1 women's scholarship pool",
    gender: "women",
    audience: "players",
    fact: "NCAA Division I women's soccer is 14 equivalency scholarships for the whole roster — still usually partials, not 14 full rides.",
    beats: [
      "D1 women share 14 scholarships. Still one pool.",
      "14 split across ~28 players is mostly partials, not full rides.",
      "More aid than men. Still not 14 full rides.",
      "Ask for the exact % and what happens if you get hurt.",
    ],
    match: ["14 equivalency", "14 scholarships", "d1 women share 14"],
    solution: "Ryval shows women's programs still recruiting your position.",
    coachSolution: "Ryval lets coaches post women's roster needs they can actually fill.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    topic: "How rare D1 is",
    gender: "any",
    audience: "parents",
    fact: "Hundreds of thousands of U.S. high school soccer players; only a thin slice reach NCAA D1. Most college soccer is D2, D3, NAIA, or JUCO.",
    beats: [
      "Hundreds of thousands play high school. A thin slice reach D1.",
      "Most college soccer is D2, D3, NAIA, or JUCO — not D1.",
      "Chasing only D1 wastes a year you could be playing.",
      "Build a list that includes D2, D3, NAIA, and JUCO on purpose.",
    ],
    match: ["thin slice reach d1", "hundreds of thousands play"],
    solution: "Ryval lists D2, D3, NAIA, and JUCO programs that actually fit.",
    coachSolution: "Ryval surfaces players at your level — not only D1 hopefuls.",
    screen: "/app-screens/university.jpg",
  },
  {
    topic: "D3 has no athletic scholarships",
    gender: "any",
    audience: "parents",
    fact: "NCAA Division III cannot give athletic scholarships. Aid is academic or need-based. D3 is still real college soccer, not a participation trophy.",
    beats: [
      "D3 cannot pay athletic scholarships. That's the rule.",
      "Aid is academic or need-based — not a roster bonus.",
      "D3 is still real college soccer, not a consolation prize.",
      "Pick D3 for the degree, the minutes, and the fit.",
    ],
    match: ["d3 cannot", "no athletic scholarships", "need-based"],
    solution: "Ryval helps you find D3 programs that recruit your film and your major.",
    coachSolution: "Ryval lets D3 coaches find players who want minutes and a real campus.",
    screen: "/app-screens/university.jpg",
  },
  {
    topic: "NCAA eligibility clock",
    gender: "any",
    audience: "players",
    fact: "NCAA athletes generally get 5 calendar years to play 4 seasons. Sitting out still burns the clock.",
    beats: [
      "NCAA clock: 5 calendar years to play 4 seasons.",
      "Sitting out a year still burns the clock.",
      "A redshirt is a plan. A wasted year is not.",
      "Ask how this year counts before you transfer or sit.",
    ],
    match: ["5 calendar years", "burns the clock", "eligibility clock"],
    solution: "Ryval keeps your timeline and film in one profile coaches can open.",
    coachSolution: "Ryval shows a player's clock and film without another email chain.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Transfer portal minutes",
    gender: "any",
    audience: "players",
    fact: "The NCAA transfer portal is real and crowded. Coaches hunt proven college minutes, not another raw highlight tape.",
    beats: [
      "The transfer portal is real — and crowded.",
      "Coaches hunt proven college minutes, not a new high school tape.",
      "Entering the portal is not a plan. A target list is.",
      "Lead with minutes played, then the clip coaches need.",
    ],
    match: ["transfer portal", "proven college minutes"],
    solution: "Ryval matches transfers to coaches hunting proven minutes.",
    coachSolution: "Ryval shows transfers with real minutes — not another raw tape.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    topic: "JUCO second door",
    gender: "any",
    audience: "players",
    fact: "NJCAA (JUCO) is a legit second door into 4-year soccer if you need film, grades, or a late growth year.",
    beats: [
      "JUCO (NJCAA) is a real second door into 4-year soccer.",
      "Use it for film, grades, or a late growth year — on purpose.",
      "JUCO is not a dead end. Sitting home is.",
      "Pick a JUCO that plays you, then recruit the 4-year jump.",
    ],
    match: ["juco", "njcaa", "second door"],
    solution: "Ryval helps you find the next 4-year door after JUCO minutes.",
    coachSolution: "Ryval helps 4-year coaches find JUCO players with real minutes.",
    screen: "/app-screens/university.jpg",
  },
  {
    topic: "NAIA late window",
    gender: "any",
    audience: "coaches",
    fact: "NAIA programs can offer athletic aid and often recruit later than D1. It's a real roster, not 'not NCAA so it doesn't count.'",
    beats: [
      "NAIA programs can offer athletic aid.",
      "They often recruit later than D1. That's a window, not a slight.",
      "NAIA is a real roster — not 'doesn't count.'",
      "Add NAIA schools if D1 lists went quiet after spring.",
    ],
    match: ["naia programs", "recruit later than d1"],
    solution: "Ryval includes NAIA programs that still recruit late.",
    coachSolution: "Ryval lets NAIA coaches reach players D1 already passed on.",
    screen: "/app-screens/discover.jpg",
  },

  // ── US youth / academy ──
  {
    topic: "MLS Next is not a college fair",
    gender: "men",
    audience: "players",
    fact: "MLS Next is a high-level boys development league tied to MLS academies. A strong Next season is not automatically a college recruiting plan — different buyers, different tape.",
    beats: [
      "MLS Next is a development league, not a college admissions fair.",
      "Academy staff and college coaches are different buyers.",
      "A Next badge without a findable profile still dies in a group chat.",
      "Decide the next door: Homegrown track, college, or a trial list.",
    ],
    match: ["mls next", "development league", "next badge"],
    solution: "Ryval keeps your Next film on a profile college and pro coaches can open.",
    coachSolution: "Ryval lets you find Next players by position without another weekend event.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "ECNL still needs openable film",
    gender: "women",
    audience: "players",
    fact: "ECNL is a top girls club pathway in the U.S. The league badge gets you in the room. Coaches still click off if the first clip is not a real action.",
    beats: [
      "ECNL is a top U.S. girls pathway — not a finished resume.",
      "The badge gets a glance. The first clip keeps the glance.",
      "A showcase weekend is not a substitute for a profile coaches can reopen.",
      "Cut film by position, then put it where scouts already look.",
    ],
    match: ["ecnl", "girls pathway", "badge gets"],
    solution: "Ryval puts ECNL film on a profile women's coaches can reopen after the event.",
    coachSolution: "Ryval lets women's coaches shortlist ECNL players by position, not by who emailed first.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "Pay-to-play vs free academies",
    gender: "any",
    audience: "parents",
    fact: "U.S. club soccer is mostly pay-to-play (often thousands per year plus travel). Many European and some pro academies charge little or nothing because the club owns the pathway.",
    beats: [
      "U.S. club soccer is mostly pay-to-play. Budget that in writing.",
      "Many overseas academies are free because the club is the buyer.",
      "A $8k travel year is not automatically more exposure than a clear profile.",
      "Ask what you are buying: minutes, coaching, or a stamp in a program.",
    ],
    match: ["pay-to-play", "free academies", "thousands per year"],
    solution: "Ryval shows global doors so the next dollar has a target, not another hotel.",
    coachSolution: "Ryval lets coaches find players who already play — without selling another camp.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    topic: "Showcase weekends vs a profile",
    gender: "any",
    audience: "parents",
    fact: "A showcase is a 48-hour look. Coaches who liked a player still lose the name in a notes app. A lasting profile with film outlives the weekend.",
    beats: [
      "A showcase is a 48-hour look, not a career plan.",
      "Coaches lose names in notes apps the next Monday.",
      "If they cannot reopen your film, the weekend was a trip.",
      "Build the profile before you buy the next hotel.",
    ],
    match: ["showcase is a 48", "notes app", "outlives the weekend"],
    solution: "Ryval keeps film and position live after the showcase parking lot empties.",
    coachSolution: "Ryval lets coaches reopen players they circled — without hunting a parent email.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Homegrown fork vs school path",
    gender: "men",
    audience: "parents",
    fact: "MLS Homegrown players can skip college and sign with their academy club. Most U.S. boys still develop through school, club, or college. Mixing the two roads wastes a year.",
    beats: [
      "Homegrown is a club contract path. College is a different buyer.",
      "Most U.S. boys still develop through school, club, or campus.",
      "Don't treat a showcase like an MLS trial. Different tape.",
      "Pick a road this season: academy minutes or a college list.",
    ],
    match: ["homegrown", "skip college", "academy club"],
    solution: "Ryval holds both doors — college lists and coaches who actually hunt your class.",
    coachSolution: "Ryval separates academy noise from players who want your roster.",
    screen: "/app-screens/discover.jpg",
  },
  {
    topic: "ID camp is a receipt",
    gender: "any",
    audience: "parents",
    fact: "College ID camps are paid looks. Some are useful. Many are revenue. A camp invite is not an offer, and a camp film dump is not a recruiting plan.",
    beats: [
      "An ID camp is a paid look. Some are useful. Many are revenue.",
      "A camp invite is not an offer.",
      "If they wanted you, they would already have a clip they can reopen.",
      "Ask what film they keep after you leave campus.",
    ],
    match: ["id camp", "paid look", "camp invite is not"],
    solution: "Ryval lets you send the same film without buying another camp weekend.",
    coachSolution: "Ryval shows players who already fit — before you sell another ID date.",
    screen: "/app-screens/quick-scout.jpg",
  },
  {
    topic: "Youth minutes beat tournament stamps",
    gender: "any",
    audience: "players",
    fact: "Coaches hunt minutes in real games: starts, 90s, and actions under pressure. A medal from a weekend tournament is a stamp, not a body of work.",
    beats: [
      "Coaches hunt minutes in real games, not medals.",
      "Starts and 90s beat a weekend tournament stamp.",
      "If you sat for the 'better' team, the tape is empty.",
      "Play where you play. Then cut the actions that matter.",
    ],
    match: ["tournament stamps", "starts and 90s", "weekend tournament"],
    solution: "Ryval leads with minutes and position so coaches skip the medal pile.",
    coachSolution: "Ryval surfaces players with real minutes, not another tournament graphic.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Club coach is the missing recruiter",
    gender: "any",
    audience: "coaches",
    fact: "Club coaches see the player every week. College and pro staffs do not. If the DOC has no place to send a short profile, good kids stay local rumors.",
    beats: [
      "Your club coach sees you every week. College staffs do not.",
      "A verbal 'I'll make a call' dies in a busy season.",
      "DOCs need a link, not another 12-email thread.",
      "Package film + position so your coach can forward you in 20 seconds.",
    ],
    match: ["missing recruiter", "docs need a link", "club coach sees you"],
    solution: "Ryval gives your DOC a profile they can forward instead of writing a novel.",
    coachSolution: "Ryval lets club staff pass players to college and pro coaches without a spreadsheet.",
    screen: "/app-screens/applicants.jpg",
  },

  // ── Pro pathways ──
  {
    topic: "USL is a real second division",
    gender: "men",
    audience: "players",
    fact: "USL Championship is the recognized second tier of men's pro soccer in the U.S. It is a job path — contracts, travel, and film standards — not a participation league.",
    beats: [
      "USL Championship is a real second-division job path.",
      "Coaches there hunt a position this window, not a vibe.",
      "A college senior tape is not automatically a USL tape.",
      "Lead with minutes, position, and one clip they can reopen.",
    ],
    match: ["usl championship", "second-division", "second tier"],
    solution: "Ryval puts your film in front of coaches posting real roster needs — including pro doors.",
    coachSolution: "Ryval lets USL staff find players by position without another open-trial circus.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    topic: "NWSL still buys college minutes",
    gender: "women",
    audience: "players",
    fact: "NWSL still takes a large share of players from the college game, plus youth national-team and international paths. A senior year without findable film is a wasted draft cycle.",
    beats: [
      "NWSL still buys a lot of college minutes.",
      "Youth national team is one door. Campus film is another.",
      "A senior year nobody can reopen is a wasted cycle.",
      "Cut the actions NWSL staff actually grade: speed of play, 1v1, end product.",
    ],
    match: ["nwsl still", "draft cycle", "college minutes"],
    solution: "Ryval keeps senior film on a profile NWSL and college staffs can share.",
    coachSolution: "Ryval lets women's pro and college staffs shortlist the same player once.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    topic: "MLS SuperDraft is not the only door",
    gender: "men",
    audience: "players",
    fact: "The MLS SuperDraft is one intake. Homegrown, college free agency, and lower-division minutes move more careers than waiting on draft night.",
    beats: [
      "SuperDraft is one intake, not the sport.",
      "Homegrown and free agency move more careers than TV night.",
      "Waiting on draft night without a profile is a silent year.",
      "Build a list: MLS, Next Pro, USL — then put film where those coaches look.",
    ],
    match: ["superdraft", "draft night", "college free agency"],
    solution: "Ryval lists more than one pro door so you are not betting a year on one night.",
    coachSolution: "Ryval shows seniors and free agents by position before draft week chaos.",
    screen: "/app-screens/discover.jpg",
  },
  {
    topic: "Open trial vs invited look",
    gender: "any",
    audience: "players",
    fact: "Open trials are cattle calls. Invited looks are short lists. Paying to 'be seen' without film a coach already opened is how you buy a number bib.",
    beats: [
      "Open trials are cattle calls. Invited looks are short lists.",
      "A number bib is not a scouting report.",
      "If they never opened your film, you paid for a lineup spot.",
      "Send the clip first. Buy the flight second.",
    ],
    match: ["open trial", "invited look", "number bib"],
    solution: "Ryval gets your film to coaches before you buy another trial bib.",
    coachSolution: "Ryval lets you invite players you already graded — not 200 walk-ups.",
    screen: "/app-screens/quick-scout.jpg",
  },
  {
    topic: "Women's pro ladder under NWSL",
    gender: "women",
    audience: "players",
    fact: "USL Super League, USL W, and WPSL sit under/beside NWSL as real minutes. A 'didn't get drafted' year can still be a contract year if someone can find you.",
    beats: [
      "There is a women's pro ladder under and beside NWSL.",
      "USL Super League, USL W, and WPSL are minutes, not charity.",
      "'Didn't get drafted' is not the end of a season.",
      "Keep film live so those coaches can find a 9 or a CB in May.",
    ],
    match: ["usl super league", "wpsl", "didn't get drafted"],
    solution: "Ryval keeps you findable for women's clubs that recruit after draft week.",
    coachSolution: "Ryval lets women's pro staffs post a need and see film the same day.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    topic: "MLS Next Pro is a job tape",
    gender: "men",
    audience: "players",
    fact: "MLS Next Pro is a professional development league. Staffs grade repeatable actions over 90 minutes, not a three-goal montage from high school.",
    beats: [
      "Next Pro is a job tape, not a high-school montage.",
      "Staffs grade repeatable actions across 90 minutes.",
      "Three goals with no context is a trailer, not evidence.",
      "Show build-up, recoveries, and the action they hired the position for.",
    ],
    match: ["next pro", "job tape", "repeatable actions"],
    solution: "Ryval holds a Next Pro-ready clip next to the position you actually play.",
    coachSolution: "Ryval lets Next Pro staffs filter by position instead of inbox montages.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "College tape is not a pro tape",
    gender: "any",
    audience: "players",
    fact: "Pro staffs want speed of play, duels, and decisions in tight space. A college highlight that starts with the goal is the wrong first frame for a trial.",
    beats: [
      "Pro staffs grade speed of play and duels, not just goals.",
      "If the first frame is a finish, they never see the decision.",
      "College tape and trial tape have different first clips.",
      "Recut: first action is the job you want paid for.",
    ],
    match: ["pro tape", "speed of play", "wrong first frame"],
    solution: "Ryval keeps a short trial cut on the same profile as your college minutes.",
    coachSolution: "Ryval lets pro staffs open a trial cut without a 9-minute campus reel.",
    screen: "/app-screens/reel.jpg",
  },

  // ── International pathways ──
  {
    topic: "Europe academy age walls",
    gender: "any",
    audience: "players",
    fact: "Most European academies make first-team or release decisions around 16–19. Showing up at 21 with only U.S. club film is a different market — first team, free agent, or college, not U15 trials.",
    beats: [
      "European academies decide early — often 16 to 19.",
      "A 21-year-old is not walking into a U15 trial.",
      "Late arrivals need first-team or free-agent tape, not academy myths.",
      "Age-check the door before you buy the flight.",
    ],
    match: ["age walls", "16–19", "u15 trial"],
    solution: "Ryval shows doors that match your age — not a fantasy academy open call.",
    coachSolution: "Ryval lets European staffs find age-right players without another cattle-call trial.",
    screen: "/app-screens/discover.jpg",
  },
  {
    topic: "Latin America club ladder",
    gender: "any",
    audience: "players",
    fact: "In much of Latin America the club ladder (youth → reserve → first team) is the path. U.S. pay-to-play showcases do not translate. Clubs want minutes in their system or a profile they can verify.",
    beats: [
      "LatAm paths run through clubs, not hotel showcases.",
      "Youth to reserve to first team is the ladder.",
      "A U.S. tournament stamp does not replace verified minutes.",
      "Get a profile a sporting director can open without a middleman.",
    ],
    match: ["latin america", "latam", "club ladder"],
    solution: "Ryval gives Latin American players a profile clubs outside the city can verify.",
    coachSolution: "Ryval lets scouts find LatAm players by position without another unofficial agent.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Africa-to-Europe paperwork",
    gender: "any",
    audience: "players",
    fact: "Africa-to-Europe moves die on paperwork as often as on talent: representation, trials that never issue a ticket, and clubs that will not look without a clean profile.",
    beats: [
      "Paperwork kills Africa-to-Europe moves as often as talent does.",
      "A trial with no ticket and no club name is not a trial.",
      "Unverified agents sell hope. Clubs buy film they can open.",
      "Get findable first. Then talk visas with a real club, not a stranger.",
    ],
    match: ["africa-to-europe", "paperwork kills", "unverified agents"],
    solution: "Ryval puts verified film where coaches look — without the stranger-in-the-DM deal.",
    coachSolution: "Ryval lets European staffs review African players on one profile, not a WhatsApp rumor.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Asia and Oceania doors",
    gender: "any",
    audience: "players",
    fact: "J-League, K League, A-League, and Southeast Asian clubs recruit foreigners on specific roster slots. They hunt a position and a work-permit story, not a generic 'I want to go pro' reel.",
    beats: [
      "Asia and Oceania clubs hire a position on a foreign slot.",
      "J-League, K League, and A-League are different rules, same idea.",
      "A generic 'go pro' reel does not answer the permit question.",
      "Lead with position, minutes, and a passport they can plan around.",
    ],
    match: ["a-league", "j-league", "k league", "foreign slot"],
    solution: "Ryval packages position + film so clubs filling a foreign slot can actually find you.",
    coachSolution: "Ryval lets Asian and Oceania staffs shortlist foreigners by position, not inbox chaos.",
    screen: "/app-screens/opportunities.jpg",
  },
  {
    topic: "UK work permit is not a vibe",
    gender: "any",
    audience: "coaches",
    fact: "Non-settled players in England need a Governing Body Endorsement (points for appearances, league level, last club). High-level only: talent is not a permit. This is not legal advice.",
    beats: [
      "England is not 'just get a trial and stay.'",
      "GBE points come from appearances, level, and last club.",
      "Talent is not a work permit. Plan the paperwork with the club.",
      "This is a map, not legal advice — ask the club's compliance person.",
    ],
    match: ["work permit", "governing body", "gbe points"],
    solution: "Ryval makes you findable so a club can run real compliance, not a DM promise.",
    coachSolution: "Ryval shows film + history so your compliance staff can start a real GBE check.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Visa is not a scholarship",
    gender: "any",
    audience: "parents",
    fact: "A U.S. college I-20 / F-1 is a student visa path. A pro club needs a different work authorization. Mixing 'scholarship' and 'I'm moving countries' is how families lose a year.",
    beats: [
      "A student visa and a work permit are different doors.",
      "A scholarship offer is not a club work visa.",
      "Mixing the two is how families lose a year.",
      "Name the path: campus, academy, or pro — then the paper that matches.",
    ],
    match: ["visa is not", "f-1", "student visa"],
    solution: "Ryval keeps campus and club doors separate so the paperwork matches the path.",
    coachSolution: "Ryval shows whether a player is hunting campus or a contract — before you fly them.",
    screen: "/app-screens/university.jpg",
  },
  {
    topic: "Dual passport advantage",
    gender: "any",
    audience: "players",
    fact: "A second passport can change which leagues treat you as domestic. It does not replace film. Coaches still need a position and a clip they can reopen.",
    beats: [
      "A second passport can change how a league counts you.",
      "It does not replace film or minutes.",
      "Don't lead with the passport and hide a weak tape.",
      "Put citizenship next to position so staffs can plan a slot.",
    ],
    match: ["dual passport", "second passport", "treat you as domestic"],
    solution: "Ryval puts passport and position on the same profile coaches can plan around.",
    coachSolution: "Ryval shows eligibility context next to film — not a surprise at the airport.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Agents vs a findable profile",
    gender: "any",
    audience: "players",
    fact: "A licensed intermediary can help a real offer. An unlicensed stranger selling 'I know a club in Europe' is a tax. Clubs still need film they can open without you.",
    beats: [
      "A licensed intermediary helps a real offer.",
      "A stranger selling 'I know a club' is a tax.",
      "Clubs still need film they can open without you on the call.",
      "Get findable first. Then decide if you need an agent.",
    ],
    match: ["unlicensed stranger", "know a club in europe", "findable profile"],
    solution: "Ryval makes you findable so a real club — or a real agent — has something to send.",
    coachSolution: "Ryval lets you open a player without going through a stranger's WhatsApp.",
    screen: "/app-screens/discover.jpg",
  },

  // ── Women's / men's game structure ──
  {
    topic: "Women's scout traffic gap",
    gender: "women",
    audience: "coaches",
    fact: "Women's players often pay the same club fees for thinner scout traffic. The fix is not another generic hustle post — it is film and roster needs that travel without a packed sideline.",
    beats: [
      "Same club fees. Thinner scout traffic. That's the gap.",
      "Another hustle quote does not put a CB on a shortlist.",
      "Film has to travel when the sideline is empty.",
      "Post the need. Keep the profile live after the event.",
    ],
    match: ["scout traffic", "thinner scout", "empty sideline"],
    solution: "Ryval keeps women's film live for coaches who were not on that sideline.",
    coachSolution: "Ryval lets women's coaches recruit globally without living at every showcase.",
    screen: "/app-screens/discover.jpg",
  },
  {
    topic: "Men's showcase glut",
    gender: "men",
    audience: "coaches",
    fact: "Boys' events are oversupplied. Coaches cannot watch 80 games. They survive with position filters and short film — or they guess from who emailed last.",
    beats: [
      "Boys' showcases are oversupplied. Nobody watches 80 games.",
      "Coaches survive with position filters and short film.",
      "Last email in the inbox is not a scouting method.",
      "If you cannot filter a 9, you will sign the loud parent.",
    ],
    match: ["showcase glut", "80 games", "oversupplied"],
    solution: "Ryval puts your position and clip above the boys' event noise.",
    coachSolution: "Ryval lets you filter a position instead of surviving another 80-game weekend.",
    screen: "/app-screens/quick-scout.jpg",
  },

  // ── Coaches finding players globally ──
  {
    topic: "Inbox is not a scouting system",
    gender: "any",
    audience: "coaches",
    fact: "Unsolicited film is not recruiting. Coaches with a real need still drown in Drive links. A posted roster need plus filterable profiles is a system. An inbox is a pile.",
    beats: [
      "Unsolicited film is not a scouting system.",
      "Drive links are a pile. A posted need is a filter.",
      "If you cannot sort by position, you will miss the player you need.",
      "Post the need. Open the three profiles that match.",
    ],
    match: ["scouting system", "drive links", "unsolicited film"],
    solution: "Ryval matches you to posted needs instead of another cold email.",
    coachSolution: "Ryval lets you post a roster need and see matching film — not 400 Drive links.",
    screen: "/app-screens/applicants.jpg",
  },
  {
    topic: "Global scouting on a tiny budget",
    gender: "any",
    audience: "coaches",
    fact: "Most staffs cannot fly to four countries. They need players who are findable remotely: position, minutes, and a clip that loads. The budget problem is a discovery problem.",
    beats: [
      "Most staffs cannot fly to four countries this month.",
      "Remote discovery needs position, minutes, and a clip that loads.",
      "The budget problem is a findability problem.",
      "If the player is only in a WhatsApp, they do not exist yet.",
    ],
    match: ["tiny budget", "four countries", "findability"],
    solution: "Ryval makes you findable to staffs who cannot buy four flights.",
    coachSolution: "Ryval is remote scouting: position + film without another international ticket.",
    screen: "/app-screens/discover.jpg",
  },
  {
    topic: "Post the position you need",
    gender: "any",
    audience: "coaches",
    fact: "'Send me film' is how you get 400 left wings. Posting left back, 2007–2008, with minutes is how a coach fills a hole. Players cannot guess your roster.",
    beats: [
      "'Send me film' is how you get 400 left wings.",
      "Name the position, class, and minutes you actually need.",
      "Players cannot guess your roster hole.",
      "A posted need is kinder than a silent inbox.",
    ],
    match: ["400 left wings", "post the position", "roster hole"],
    solution: "Ryval shows posted position needs so you stop guessing who is hiring.",
    coachSolution: "Ryval lets you post the exact hole — left back, year, minutes — and get matches.",
    screen: "/app-screens/roster-need.jpg",
  },
  {
    topic: "Discovery without another flight",
    gender: "any",
    audience: "coaches",
    fact: "International moves start with a clip a sporting director can open on a phone. The flight is step four. Families that buy step four first fund someone else's weekend.",
    beats: [
      "The flight is step four. The clip is step one.",
      "A sporting director will not board without film that loads.",
      "Buying the ticket first funds someone else's weekend.",
      "Get findable. Then let a real club invite the look.",
    ],
    match: ["another flight", "step four", "sporting director"],
    solution: "Ryval is the clip-first step so the next flight is invited, not hoped.",
    coachSolution: "Ryval lets you grade a player on your phone before you spend the ticket.",
    screen: "/app-screens/quick-scout.jpg",
  },

  // ── Film, profiles, discovery ──
  {
    topic: "First 20 seconds of film",
    gender: "any",
    audience: "players",
    fact: "Coaches skim. The first dangerous action has to land in 15–30 seconds or they click off — college, pro, and academy staffs all do this.",
    beats: [
      "Coaches skim. They do not watch 8 minutes.",
      "First dangerous action has to land in 15–30 seconds.",
      "A long intro with music is how they click off.",
      "Cut the tape so the first clip is the best clip.",
    ],
    match: ["15–30 seconds", "8 minutes", "first dangerous action"],
    solution: "Ryval puts your first 20 seconds in front of coaches who asked.",
    coachSolution: "Ryval lets coaches open short film instead of a 10-minute dump.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "Position-labeled film",
    gender: "any",
    audience: "players",
    fact: "A 'midfielder' tape that is 70% goals hides the job. Label the position you want paid for and lead with those actions: scanning, angles, recoveries, service.",
    beats: [
      "If the tape is 70% goals, you hid the job.",
      "Label the position you want paid for.",
      "A 6 and a 10 are not the same highlight.",
      "Lead with the actions of that role, then the finish.",
    ],
    match: ["position-labeled", "70% goals", "a 6 and a 10"],
    solution: "Ryval files you by the position you actually play, with film that matches.",
    coachSolution: "Ryval lets you filter a 6 or a 10 — not a pile titled 'midfielder.'",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "One profile beats five Drive folders",
    gender: "any",
    audience: "parents",
    fact: "Five Google Drive folders, a Hudl link, and a coach's personal site is how players disappear. One profile with film, position, and class is what a busy staff will reopen.",
    beats: [
      "Five Drive folders is how players disappear.",
      "Busy staffs reopen one link, not a scavenger hunt.",
      "Hudl + WhatsApp + a personal site is not a system.",
      "Put film, position, and class in one place.",
    ],
    match: ["five drive", "drive folders", "scavenger hunt"],
    solution: "Ryval is the one profile: film, position, and class coaches can reopen.",
    coachSolution: "Ryval replaces the scavenger hunt with one player view.",
    screen: "/app-screens/profile.jpg",
  },

  // ── Position pathways (not hustle slop) ──
  {
    topic: "Goalkeeper pathway",
    gender: "any",
    audience: "players",
    fact: "Keepers develop later and occupy fewer roster spots. Outfield showcases bury them. GK film needs distribution, starts, and claims — not one save montage.",
    beats: [
      "Keepers develop later and occupy fewer spots.",
      "Outfield showcases bury you in the corner of the frame.",
      "A save montage is not a GK tape.",
      "Show distribution, starts, and claims — then the save.",
    ],
    match: ["goalkeeper pathway", "save montage", "fewer roster spots"],
    solution: "Ryval files keepers as keepers so staffs are not hunting you inside an outfield reel.",
    coachSolution: "Ryval lets you filter goalkeepers with GK film, not a stray save in a group tape.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "Center back late bloom",
    gender: "any",
    audience: "players",
    fact: "Center backs often bloom late as bodies catch up. U16 size is not a career verdict. Staffs still need aerials, angles, and the first pass — not a growth-spurt myth.",
    beats: [
      "CBs often bloom late. U16 size is not a verdict.",
      "Staffs grade aerials, angles, and the first pass.",
      "A growth-spurt story without film is still a story.",
      "Keep minutes somewhere. Then show the actions of a CB.",
    ],
    match: ["center back", "late bloom", "u16 size"],
    solution: "Ryval keeps CB film live while the body catches up — coaches can still find you.",
    coachSolution: "Ryval surfaces CBs by actions, not by who looked 6'2 at sixteen.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "The 10 needs chances created",
    gender: "any",
    audience: "players",
    fact: "Attacking mids get hired for chances created, scanning, and the pass before the pass. A 10 tape that is only finishes is a false 9 in disguise.",
    beats: [
      "A 10 is hired for chances created, not just finishes.",
      "Show the scan and the pass before the pass.",
      "A goals-only 10 tape is a false 9 in disguise.",
      "Lead with the assist action. Then the shot.",
    ],
    match: ["chances created", "false 9", "pass before the pass"],
    solution: "Ryval labels you as a 10 with film that shows creation, not only goals.",
    coachSolution: "Ryval lets you find a 10 by creation film — not another striker montage.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "Wing is 1v1 plus end product",
    gender: "any",
    audience: "players",
    fact: "Wingers get graded on the take-on and what happens next: cutback, early cross, or shot. A skill-move compilation without end product is entertainment.",
    beats: [
      "Wings are graded on the 1v1 and what happens next.",
      "Cutback, early cross, or shot — pick the end product.",
      "A skill compilation without a finish is entertainment.",
      "First clip: beat someone and hurt them.",
    ],
    match: ["end product", "skill-move", "early cross"],
    solution: "Ryval files wingers with take-on + end-product film coaches can grade fast.",
    coachSolution: "Ryval lets you shortlist wingers who finish the action, not just the move.",
    screen: "/app-screens/reel.jpg",
  },
  {
    topic: "Modern fullback job",
    gender: "any",
    audience: "players",
    fact: "Fullbacks now overlap, invert, or hold width on command. A tape of only tackles hides the job. Show the first pass and the recovery after you go.",
    beats: [
      "Fullbacks overlap, invert, or hold width on command.",
      "A tackles-only tape hides the modern job.",
      "Show the first pass and the recovery after you go.",
      "Label left or right. The sides are different hires.",
    ],
    match: ["modern fullback", "overlap, invert", "tackles-only"],
    solution: "Ryval lists you as a left or right back with the actions that role actually needs.",
    coachSolution: "Ryval lets you hire a fullback by side and job, not 'defender' in a subject line.",
    screen: "/app-screens/roster-need.jpg",
  },

  // ── NIL / eligibility / coaching (high level) ──
  {
    topic: "NIL changed the pitch not the film",
    gender: "any",
    audience: "players",
    fact: "NIL lets U.S. college athletes earn. It did not replace amateurism questions for some internationals, and it did not replace film. A deal is not a scouting report.",
    beats: [
      "NIL lets college athletes earn. It is not a scouting report.",
      "Some internationals still have amateurism questions. Get counsel.",
      "A deal does not replace minutes or film.",
      "This is a map, not legal advice — keep the tape honest.",
    ],
    match: ["nil changed", "not a scouting report", "nil lets"],
    solution: "Ryval still leads with film and position — the things coaches hire.",
    coachSolution: "Ryval shows the player you can evaluate, not the NIL graphic.",
    screen: "/app-screens/feed.jpg",
  },
  {
    topic: "International amateurism trap",
    gender: "any",
    audience: "players",
    fact: "Paid club soccer, appearance fees, or the wrong contract can burn NCAA amateurism. International players need clearance, not just a highlight link. High-level map, not legal advice.",
    beats: [
      "Paid club minutes can burn NCAA amateurism.",
      "Appearance fees or the wrong contract can end eligibility.",
      "A highlight link is not amateurism clearance.",
      "Get clearance before you email U.S. campus coaches.",
    ],
    match: ["amateurism", "appearance fees", "highlight link is not"],
    solution: "Ryval gives U.S. coaches your film in one profile while you sort eligibility.",
    coachSolution: "Ryval lets U.S. coaches review international film without a spam inbox.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Eligibility Center is campus paperwork",
    gender: "any",
    audience: "parents",
    fact: "D1/D2 recruits must register with the NCAA Eligibility Center. Core GPA + amateurism matter as much as film — for the campus path only. Other doors do not use this form.",
    beats: [
      "D1 and D2 recruits must register with the Eligibility Center.",
      "Core GPA and amateurism matter as much as the tape — on campus.",
      "Unregistered film goes in the maybe pile for NCAA staffs.",
      "If the path is pro or overseas, this form is not the door.",
    ],
    match: ["eligibility center", "core gpa", "unregistered film"],
    solution: "Ryval packages grades and film so campus coaches aren't chasing PDFs.",
    coachSolution: "Ryval shows eligible campus players with film attached — not a random Drive link.",
    screen: "/app-screens/profile.jpg",
  },
  {
    topic: "Coaching license is a second path",
    gender: "any",
    audience: "coaches",
    fact: "USSF, UEFA, and CONMEBOL badges are a career path when playing minutes stop. Trainers still need players they can place — a license without a network is a weekend course.",
    beats: [
      "A coaching badge is a second path when minutes stop.",
      "USSF, UEFA, CONMEBOL — pick the ladder you can finish.",
      "A license without a network is a weekend course.",
      "The job is still placing players and posting what you need.",
    ],
    match: ["coaching license", "weekend course", "ussf, uefa"],
    solution: "Ryval gives trainers a place to put players they actually believe in.",
    coachSolution: "Ryval is the network after the badge: findable players, posted needs.",
    screen: "/app-screens/feed.jpg",
  },
  {
    topic: "Walk-ons still fill campus rosters",
    gender: "any",
    audience: "players",
    fact: "Most D1/D2 roster spots are walk-ons or tiny partials. 'We want you' ≠ a full ride. Ask for the scholarship percentage — and know campus is only one market.",
    beats: [
      "Most D1 and D2 spots are walk-ons or tiny partials.",
      "'We want you' is not a scholarship offer.",
      "Ask one number: what percentage of a ride is this?",
      "Campus is one market. Club and pro doors still exist.",
    ],
    match: ["walk-ons", "tiny partials", "percentage of a ride"],
    solution: "Ryval shows walk-on and partial-need programs, not just D1 hype.",
    coachSolution: "Ryval lets you post walk-on and partial needs players can actually see.",
    screen: "/app-screens/roster-need.jpg",
  },
];

export function laneMatchScore(blob: string, lane: FactLane): number {
  const text = blob.toLowerCase();
  let score = 0;
  if (text.includes(lane.topic.toLowerCase())) score += 6;
  for (const m of lane.match) {
    if (m && text.includes(m.toLowerCase())) score += 4;
  }
  if (text.includes(lane.fact.slice(0, 48).toLowerCase())) score += 2;
  for (const b of lane.beats) {
    const chip = b.toLowerCase().slice(0, 36);
    if (chip.length >= 16 && text.includes(chip)) score += 1;
  }
  return score;
}

export function laneNotes(topic: string) {
  return `lane:${topic}`;
}

export function topicFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const line = notes
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.startsWith("lane:"));
  if (!line) return null;
  const topic = line.slice("lane:".length).trim();
  return topic || null;
}

/** Adjacent posts in the same family feel like the same TikTok. */
const TOPIC_FAMILY: Record<string, string> = {
  "D1 men's scholarship pool": "college-money",
  "D1 women's scholarship pool": "college-money",
  "How rare D1 is": "college-odds",
  "D3 has no athletic scholarships": "college-money",
  "NCAA eligibility clock": "college-rules",
  "Transfer portal minutes": "college-rules",
  "JUCO second door": "college-alt",
  "NAIA late window": "college-alt",
  "MLS Next is not a college fair": "youth-path",
  "ECNL still needs openable film": "youth-path",
  "Pay-to-play vs free academies": "youth-path",
  "Showcase weekends vs a profile": "showcases",
  "Homegrown fork vs school path": "homegrown",
  "ID camp is a receipt": "showcases",
  "Youth minutes beat tournament stamps": "youth-path",
  "Club coach is the missing recruiter": "youth-path",
  "USL is a real second division": "us-pro-men",
  "NWSL still buys college minutes": "us-pro-women",
  "MLS SuperDraft is not the only door": "draft",
  "Open trial vs invited look": "trials",
  "Women's pro ladder under NWSL": "us-pro-women",
  "MLS Next Pro is a job tape": "us-pro-men",
  "College tape is not a pro tape": "film",
  "Europe academy age walls": "europe",
  "Latin America club ladder": "latam",
  "Africa-to-Europe paperwork": "africa",
  "Asia and Oceania doors": "asia",
  "UK work permit is not a vibe": "europe",
  "Visa is not a scholarship": "visa",
  "Dual passport advantage": "visa",
  "Agents vs a findable profile": "agents",
  "Women's scout traffic gap": "gender-gap",
  "Men's showcase glut": "showcases",
  "Inbox is not a scouting system": "coach-ops",
  "Global scouting on a tiny budget": "coach-ops",
  "Post the position you need": "coach-ops",
  "Discovery without another flight": "coach-ops",
  "First 20 seconds of film": "film",
  "Position-labeled film": "film",
  "One profile beats five Drive folders": "film",
  "Goalkeeper pathway": "positions-gk",
  "Center back late bloom": "positions-cb",
  "The 10 needs chances created": "positions-10",
  "Wing is 1v1 plus end product": "positions-wing",
  "Modern fullback job": "positions-fb",
  "NIL changed the pitch not the film": "nil",
  "International amateurism trap": "visa",
  "Eligibility Center is campus paperwork": "college-rules",
  "Coaching license is a second path": "coaching-career",
  "Walk-ons still fill campus rosters": "college-money",
};

const RECRUITING_FIRST = new Set([
  "visa",
  "film",
  "coach-ops",
  "us-pro-men",
  "us-pro-women",
  "trials",
  "agents",
  "positions-gk",
  "positions-cb",
  "positions-10",
  "positions-wing",
  "positions-fb",
  "college-rules",
  "europe",
]);

export function familyOf(topic: string): string {
  return TOPIC_FAMILY[topic] ?? familyFromCopy(topic);
}

export function familyFromCopy(blob: string): string {
  const t = blob.toLowerCase();
  if (/super\s*draft|draft night/.test(t)) return "draft";
  if (
    /only (one )?(door|path|entrance|option|intake)|isn't the only|not the only (door|path|entrance|option)/.test(t) &&
    /\b(mls|draft|pro)\b/.test(t)
  ) {
    return "draft";
  }
  const matched = matchLaneFromCopy(blob);
  if (matched) return TOPIC_FAMILY[matched.topic] ?? matched.topic;
  return "other";
}

export function resolvedTopic(
  notes: string | null | undefined,
  blob: string,
): string | null {
  return topicFromNotes(notes) || matchLaneFromCopy(blob)?.topic || null;
}

const LEAK_RULES: Array<{ re: RegExp; unless: RegExp }> = [
  { re: /super\s*draft|draft night/i, unless: /super\s*draft|draft night/i },
  { re: /walk-?on/i, unless: /walk-?on|scholarship|ncaa|campus/i },
];

export function copyFitsLane(blob: string, lane: FactLane): boolean {
  const text = blob.toLowerCase();
  const laneKey = `${lane.topic} ${lane.match.join(" ")} ${lane.fact}`;
  const onTopic =
    text.includes(lane.topic.toLowerCase()) ||
    lane.match.some((m) => m.length >= 4 && text.includes(m.toLowerCase())) ||
    lane.beats.some((b) => {
      const chip = b.toLowerCase().slice(0, 28);
      return chip.length >= 18 && text.includes(chip);
    });
  if (!onTopic) return false;
  const copyFam = familyFromCopy(blob);
  const laneFam = familyOf(lane.topic);
  if (copyFam === "draft" && laneFam !== "draft") return false;
  for (const rule of LEAK_RULES) {
    if (rule.re.test(text) && !rule.unless.test(laneKey)) return false;
  }
  return true;
}

export function matchLaneFromCopy(blob: string): FactLane | undefined {
  let best: FactLane | undefined;
  let bestScore = 0;
  for (const lane of FACT_LANES) {
    const score = laneMatchScore(blob, lane);
    if (score > bestScore) {
      best = lane;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : undefined;
}

/**
 * Next educational lane. Never the same topic as the last post. Never the same
 * family as the last post. SuperDraft-style posts cool down for ~2 weeks of posts.
 */
export function pickNextLane(
  photoGender: PhotoGender,
  recentTopicsNewestFirst: Array<string | null | undefined>,
  recentBlobsNewestFirst: string[] = [],
): FactLane {
  const resolved = recentTopicsNewestFirst.map((topic, i) => {
    if (topic) return topic;
    return matchLaneFromCopy(recentBlobsNewestFirst[i] ?? "")?.topic ?? null;
  });
  const families = resolved.map((topic, i) =>
    topic ? familyOf(topic) : familyFromCopy(recentBlobsNewestFirst[i] ?? ""),
  );
  const pool = FACT_LANES.filter((l) => l.gender === photoGender || l.gender === "any");
  const lastTopic = resolved.find(Boolean) ?? null;
  const lastFamily = families.find((f) => f && f !== "other") ?? null;
  const recentTopicSet = new Set(resolved.filter(Boolean).slice(0, 20) as string[]);
  const recentFamilySet = new Set(
    families.filter((f) => f && f !== "other").slice(0, 6),
  );
  const draftCooling = families.slice(0, 14).includes("draft");

  const rank = (lane: FactLane) => {
    const fam = familyOf(lane.topic);
    if (lastTopic && lane.topic === lastTopic) return 100;
    if (lastFamily && fam === lastFamily) return 90;
    if (draftCooling && fam === "draft") return 85;
    if (recentTopicSet.has(lane.topic)) return 70;
    if (recentFamilySet.has(fam)) return 40;
    return 0;
  };

  const indexed = pool.map((lane, i) => ({ lane, i, score: rank(lane) }));
  // When nothing is on cooldown, lead with what a recruit can use:
  // what coaches look for, visas, and the pro or college path.
  const recruitingFirst = (topic: string) => (RECRUITING_FIRST.has(familyOf(topic)) ? 0 : 1);
  indexed.sort((a, b) => a.score - b.score || recruitingFirst(a.lane.topic) - recruitingFirst(b.lane.topic) || a.i - b.i);
  const pick =
    indexed.find((x) => x.score === 0)?.lane ??
    indexed.find((x) => x.lane.topic !== lastTopic && familyOf(x.lane.topic) !== lastFamily)?.lane ??
    indexed.find((x) => x.lane.topic !== lastTopic)?.lane ??
    indexed[0]?.lane;
  return pick ?? FACT_LANES[0];
}

export function personasForLane(lane: FactLane, photoGender: PhotoGender): Persona[] {
  const byLane = PERSONAS.filter((p) => {
    const genderOk = p.gender === photoGender || p.gender === "any";
    const lensOk = lane.audience === "any" || p.lens === lane.audience;
    return genderOk && lensOk;
  });
  if (byLane.length) return byLane;
  return PERSONAS.filter((p) => p.gender === photoGender || p.gender === "any");
}
