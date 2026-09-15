# Ryval Content Forge

Build a Ryval AI Content Generator Dashboard

I want to build an internal web app for Ryval that helps us generate, organize, and export high-volume faceless slideshow content for TikTok, Instagram, and other social platforms.

Ryval is a soccer recruiting app that helps players get discovered by college coaches and helps coaches find players faster through player profiles, clips, filters, academics, position, grad year, nationality, and recruiting signals.

This tool should act like a content factory for launch week and beyond.

Main Goal

Build a clean dashboard where I can:

 Generate faceless slideshow post ideas.

 Categorize content by audience and topic.

 Store hooks, slide text, captions, hashtags, and CTAs.

 Upload Ryval app screenshots / Figma screens / product mockups.

 Automatically add a CTA slide using our app screens.

 Review, edit, approve, and export content.

 Organize posts by status: idea, drafted, designed, approved, scheduled, posted.

 Eventually connect to Canva, Buffer, Metricool, or social posting tools.

The design should feel premium, modern, clean, and startup-like. Think: Linear, Notion, Runway, Perplexity, and premium sports tech.

Pages Needed

1. Dashboard Home

Create a main dashboard showing:

 Total posts generated

 Posts approved

 Posts scheduled

 Posts posted

 Best-performing categories

 Content needed today

 Upcoming launch countdown

 Quick button: “Generate New Batch”

 Quick button: “Upload Screens”

 Quick button: “Export Approved Posts”

The dashboard should feel like a content command center.

2. Content Generator Page

This is the core page.

User should be able to select:

 Platform: TikTok, Instagram, YouTube Shorts, LinkedIn

 Page/account: Ryval main page, Recruiting Truth page, Global Soccer Pathway page, founder page

 Audience: players, parents, coaches, academies, international players

 Category: pain point, educational, coach POV, parent POV, international pathway, Ryval soft pitch, launch countdown, product feature

 Tone: direct, intense, premium, educational, founder-led, emotional

 Number of posts to generate: 5, 10, 25, 50

 Slides per post: 5, 6, 7

 CTA type: join waitlist, download app, build profile, coach early access, follow for recruiting tips

 Include app screenshot CTA: yes/no

Then the user clicks:

Generate Posts

The system should generate multiple carousel/slideshow post drafts.

Each generated post should include:

 Hook

 Slide 2

 Slide 3

 Slide 4

 Slide 5

 Optional Slide 6

 CTA slide

 Caption

 Hashtags

 Suggested page/account

 Suggested platform

 Category

 Audience

 Status

 Created date

Keep slide copy short. Max 12 words per slide by default.

Content Categories

Build preset categories:

Harsh Recruiting Truths

Examples:

 Most players are invisible to coaches.

 Talent is not enough if nobody sees you.

 Your highlight tape is probably too long.

 Instagram is not a recruiting profile.

 Coaches do not have time to chase your info.

Highlight Tape Tips

Examples:

 Your best play should be first.

 Coaches decide fast.

 Do not start with slow intros.

 Show your position clearly.

 Make evaluation easy.

Coach POV

Examples:

 Coaches need organized player info.

 Coaches skip messy profiles.

 Coaches recruit by need, not hype.

 Coaches want video, academics, position, and availability fast.

Parent Education

Examples:

 Exposure is not the same as recruiting.

 Parents need to understand the timeline.

 Do not wait until senior year.

 A clean profile can help your athlete stand out.

International Player Pathway

Examples:

 International players need to simplify evaluation.

 U.S. coaches need academics, video, and contact info.

 Your country does not matter if your profile is impossible to evaluate.

 Make it easy for coaches to understand your level.

Ryval Soft Pitch

Examples:

 Your clips, academics, and goals should live in one place.

 Ryval helps players build recruiting profiles.

 Ryval helps coaches discover players faster.

 The recruiting process is moving mobile.

Launch Countdown

Examples:

 Ryval launches soon.

 The future of athlete exposure starts here.

 Players and coaches are getting early access.

 Recruiting is changing.

Post Library Page

Create a database/table view of all generated posts.

Columns:

 Title / Hook

 Category

 Audience

 Platform

 Page/account

 Status

 Date created

 Scheduled date

 Performance notes

 CTA type

 Asset attached

 Approved yes/no

Filters:

 By category

 By audience

 By platform

 By status

 By page/account

 By date

 By CTA type

Each post should open into a detail view where I can edit:

 Slide text

 Caption

 Hashtags

 CTA

 Assigned screenshot

 Notes

 Status

Statuses:

 Idea

 Drafted

 Needs edit

 Approved

 Designed

 Scheduled

 Posted

 Winner

 Reuse later

App Screen / Asset Library

Create a page where I can upload and store Ryval assets:

 App screenshots

 Figma exports

 Product mockups

 Logo files

 Founder photos

 Player profile screenshots

 Coach dashboard screenshots

 Launch graphics

 Brand backgrounds

For each asset, allow tags:

 Player profile

 Coach dashboard

 Feed

 Reels

 Opportunities

 Discover

 CTA

 Waitlist

 App Store

 Launch

 Dark mode

 Light mode

The system should allow me to choose which uploaded screen appears on the final CTA slide of a carousel.

Example CTA slide:

Text:

Build your Ryval profile before launch.

Visual:

Use uploaded Ryval app screenshot in phone mockup.

Button-style text:

Join early

Carousel Preview Builder

For each post, create a preview mode that shows all slides visually.

Each slide should have:

 Big headline text

 Optional subtext

 Background style

 Small Ryval logo

 Slide number

 Optional app screenshot on CTA slide

The user should be able to switch between templates:

 Dark Premium

 Clean White

 Soccer Field Background

 Bold Black Text

 Ryval Blue Accent

 Founder Insight Style

Make the templates reusable.

The final CTA slide should be more branded than the rest and can include a phone mockup with a Ryval app screen.

Export Functionality

Allow exports in these formats:

 CSV for Canva Bulk Create

 Google Sheets-compatible CSV

 JSON

 Copy captions

 Download post batch as structured text

 Eventually export visual slides as PNG or PDF if possible

CSV columns should include:

 Page

 Platform

 Category

 Audience

 Hook

 Slide 2

 Slide 3

 Slide 4

 Slide 5

 Slide 6

 CTA

 Caption

 Hashtags

 Asset URL

 Status

 Scheduled Date

Make the CSV compatible with Canva Bulk Create.

AI Prompt System

Create a reusable AI prompt engine inside the app.

There should be editable prompt templates.

Default prompt:

“Create faceless slideshow carousel posts for Ryval, a soccer recruiting app helping athletes get discovered and helping college coaches find players faster. Each post should have short, powerful slide text, max 12 words per slide. Tone should be direct, helpful, premium, slightly intense, and not cheesy. Do not overpromise scholarships or guaranteed recruitment. Make the content useful first, then softly point to Ryval.”

Allow me to edit:

 Brand description

 Tone rules

 Do-not-say rules

 CTA rules

 Audience rules

 Category rules

 Hashtag rules

Do-not-say rules:

 Do not promise scholarships.

 Do not say every player will get recruited.

 Do not sound scammy.

 Do not use fake coach quotes.

 Do not use overly cheesy motivational language.

 Do not make Ryval sound bigger than it is yet.

 Do not use NCAA logos or school logos unless uploaded/approved.

Daily Content Planner

Create a calendar/planner page.

It should let me plan posts by day.

Example daily posting plan:

Ryval Main Page

 1 premium product post

 1 founder/story post

Recruiting Truth Page

 3 faceless slideshows

Global Soccer Pathway Page

 3 faceless slideshows

TikTok

 5–6 slideshow posts

The planner should show:

 Date

 Time

 Platform

 Account

 Post

 Status

 Caption

 Asset

 Notes

Suggested posting windows:

 9:00 AM

 12:30 PM

 3:30 PM

 6:30 PM

 8:30 PM

 10:00 PM

Allow drag-and-drop if possible.

Performance Tracker

Add a page where I can manually enter post performance:

 Views

 Likes

 Comments

 Shares

 Saves

 Profile visits

 Link clicks

 Signups

 Notes

The app should help identify winning hooks and categories.

Show:

 Best hooks

 Best categories

 Best audience

 Best platform

 Best CTA

 Posts worth reposting

 Posts to avoid repeating

Add a “Mark as Winner” button.

Winner posts should be reusable and easy to duplicate into new variations.

Brand Voice

Ryval content should sound:

 Direct

 Human

 Confident

 Useful

 Slightly intense

 Premium

 Modern

 Not corporate

 Not cheesy

 Not like generic AI

Examples of good tone:

Talent is not enough if no coach can find you.

Coaches do not have time to piece your career together.

Your highlight tape should make evaluation easy.

A clean profile can change how fast a coach understands you.

Recruiting is not just about being good. It is about being visible.

Examples of bad tone:

Unlock your dreams today!

Guaranteed exposure to top coaches!

Become the next superstar!

This revolutionary platform will change your life overnight!

Avoid anything that sounds fake or scammy.

User Roles

For now, this can be single-user admin only.

Later, add roles:

 Admin

 Editor

 Designer

 Social media manager

Database Structure

Create database tables for:

Posts

Fields:

 id

 hook

 slide_2

 slide_3

 slide_4

 slide_5

 slide_6

 cta

 caption

 hashtags

 category

 audience

 platform

 account

 status

 scheduled_date

 asset_id

 template_id

 performance_id

 created_at

 updated_at

Assets

Fields:

 id

 file_url

 file_name

 asset_type

 tags

 description

 created_at

Templates

Fields:

 id

 template_name

 background_style

 font_style

 logo_position

 cta_style

 created_at

Performance

Fields:

 id

 post_id

 views

 likes

 comments

 shares

 saves

 profile_visits

 link_clicks

 signups

 notes

 created_at

Prompt Templates

Fields:

 id

 name

 prompt_text

 category

 created_at

 updated_at

Design Direction

Use a premium dark UI.

Colors:

 Black / near black background

 White text

 Gray cards

 Electric blue accent

 Subtle green for approved/winner states

 Red/orange only for warnings

UI feel:

 Clean sidebar navigation

 Large cards

 Rounded corners

 Smooth transitions

 Modern SaaS dashboard

 Minimal clutter

 High contrast

 Premium sports-tech feel

Sidebar pages:

 Dashboard

 Generate

 Post Library

 Planner

 Assets

 Templates

 Performance

 Prompts

 Settings

MVP Version

For the first version, focus on:

 Generate posts.

 Save posts to library.

 Categorize posts.

 Upload assets/screens.

 Add selected app screen to CTA slide.

 Preview carousel.

 Export CSV for Canva Bulk Create.

 Track status manually.

Do not overbuild social posting API yet.

For launch week, I only need a reliable content generation and organization system.

Future Features

Add later:

 Canva API integration

 Buffer/Metricool integration

 TikTok scheduling

 Instagram scheduling

 Auto-generate video slideshows

 Auto-resize for TikTok/Reels/Shorts

 AI performance analysis

 Auto-generate variations of winning posts

 Team collaboration

 Comment/reply idea generator

 DM response generator for interested players/coaches

Important

Build this so it is fast and practical. I need to generate a lot of content quickly, review it, and export it into Canva/scheduling tools.

The key is not just making pretty posts. The key is helping Ryval create daily recruiting content that drives players, parents, coaches, and academies toward the app launch.

The tool should help me produce 5–10 quality slideshow posts per day without spending hours manually writing everything.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ryval-content-factory.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5230a4cc-e56d-46a8-affd-eaedaa29562d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
