# Critique: pamphlet genre content, round 1

Verdict: Needs work before it goes out.

Reviewed: `make_pamphlets.py` (GENRES, TEAM_TITLE, TEAM_WHY, team-genre panels) and the rendered `schools-2.png` and `recovery-2.png`. I also checked the sources in `knoxville/hbot_providers.md` and `channel-schools-athletic-recovery/PROPOSAL-schools-athletic-recovery.md`. Findings run worst first.

## Fix these

### 1. Team cover title and heading promise an outcome
- **Where:** Both team genres (sports teams and clubs; high school and college athletics). `TEAM_TITLE` "Help Your Athletes Recover Faster" on the cover. Page 2 heading "Why It Helps Your Team" in the `if TEAM` branch.
- **What's wrong:** "Recover Faster" is an outcome promise, the first thing a reader sees. "Helps" claims an effect. This breaks the wellness-only rule, and the back panel's own disclaimer ("not intended to diagnose, treat, cure, or prevent") contradicts the cover.
- **What happens if you don't fix it:** A team physician, athletic director or compliance officer reads the cover, sees a speed claim with no evidence, and bins the pamphlet. In a school it can also draw an FTC or state-AG "unsubstantiated claim" complaint. The disclaimer cannot rescue a headline claim.
- **Fix:** Cover title `"A Recovery Room\nfor Your Athletes"` (both lines fit the cover column). Page 2 heading `"Why Teams\nAdd a Chamber"`.

### 2. The injury bullet reads as an effect, and "commonly" has no source
- **Where:** Both team genres. `TEAM_WHY` bullet 2, "Part of the recovery routine."
- **What's wrong:** The wording "commonly add mild hyperbaric sessions ... to routines for muscle soreness ..., sprains and strains, bruises and contusions ..." has three problems.
  - It states a prevalence ("commonly") with no source on the page.
  - "routines for [injury]" reads as the chamber being used to address the injury, not as how a team schedules it.
  - "Contusions" is a standard head-injury term, and the owner's rule is that head injury never appears. "Bruises" already covers it.
- **What happens if you don't fix it:** An athletic trainer or a school's counsel reads it as a therapeutic claim attached to named injuries. A skeptic asks "commonly according to whom?" and has no answer in the pamphlet.
- **Fix:** "**Part of the recovery routine.** Your athletic trainer decides how mild hyperbaric sessions fit each athlete's routine. Some teams schedule them alongside standard care in weeks with muscle soreness, sprains and strains, bruises, overuse aches, or heavy travel. A session is not a treatment for any of these."

### 3. The under-18 panel understates Purebaric's own rule
- **Where:** Both team genres. Middle panel "Athletes under 18". The same gap applies to the high-school row "Athletes easing back".
- **What's wrong:** The panel says "only with a parent's signed consent." Per the proposal (lines 28 and 64, citing rental agreement section 4.4), the agreement requires a parent present for any user under 18. Tennessee parental waivers are also not relied on (proposal [35][36]). "Walk your staff through the rules" names no rule.
- **What happens if you don't fix it:** A high school's risk manager reads "signed consent" as sufficient, then finds the parent-present rule in the agreement. That is a bait-and-switch finding, and the district stops responding. A parent-present rule also changes whether the school can use the chamber at all.
- **Fix:** "Athletes under 18 use the chamber only with a parent's signed consent and a parent present for the session. We supply the consent form, and your own counsel reviews it."

### 4. "$100 to $125 ... at a local studio" is wrong on two counts
- **Where:** Both team genres, Tennessee build. Example box row "One session at a local studio(1)" (`single_range`, `studio_word`) and `team_footnote`. The business pamphlets' "Single session (60 min) $100 - $125" row has the same defect.
- **What's wrong:**
  - The only source is Bell Family Chiropractic (`hbot_providers.md` line 13). That is a chiropractic clinic, not a studio.
  - $100 is its follow-up session price. $125 is a first visit that includes a consultation. A single-session range of $100 to $125 is therefore wrong.
- **What happens if you don't fix it:** The business Bell Family Chiropractic can say the pamphlet misstates its pricing. Any reader who phones it finds $100. The "about ten studio sessions" sentence also fails at $125, because $979 is about 7.8 sessions there.
- **Fix:** Row label `"One session at a local clinic(1)"`, value `"$100"`. Footnote: "(1) Published 2026 price for a 60-minute mild-chamber session from a Knoxville-area clinic. All figures are estimates, not guarantees." At $100, "about the same as ten sessions" holds ($979 / $100 = 9.8). For the business table use "$100" for the single session and drop the $125.

### 5. The capacity sentence overpromises
- **Where:** Both team genres. Middle panel under "Example: a 30-athlete roster".
- **What's wrong:** "room for a second in heavy weeks" means 60 sessions a week for 30 athletes. At 8 a day that is 7.5 full 10-hour days. Eight a day also assumes 60-minute sessions, but the flap says sessions run 60 to 90 minutes, which gives 5 to 6 a day. The sentence also ignores that athletes are free only in narrow windows, such as before school or after practice.
- **What happens if you don't fix it:** An athletic director does the arithmetic and finds one chamber cannot do what the pamphlet says. A headline claim fails on the first number the reader checks.
- **Fix:** "One chamber holds one athlete at a time and runs up to 8 sessions in a 10-hour day. That covers one session a week for a 30-person roster when your staff schedule sessions across the day, not only after practice."

### 6. "Recruits notice" and "most programs your size do not have"
- **Where:** High school and college athletics. `notice` text, a `TEAM_WHY` bullet.
- **What's wrong:**
  - "Recruits notice" is the wrong audience for a high school, which does not recruit.
  - A college compliance office reads it as a recruiting-inducement pitch.
  - "Most programs your size do not have" is an unsourced fact about real programs.
- **What happens if you don't fix it:** The compliance officer, who has a veto at a college, stops reading. A high school reader sees a line written for someone else.
- **Fix:** "A recovery amenity in your training room that athletes and families can see the program invests in." The sports-teams `notice` line is fine.

### 7. "Easing back after time off" invites a return-to-play reading
- **Where:**
  - Sports teams and clubs: "Athletes easing back".
  - High school and college athletics: "Athletes easing back".
  - CrossFit and performance gyms: "Members coming back".
- **What's wrong:** "Returning after time off, within the plan your team physician sets" is the standard wording for return from injury. Next to an injury list, it ties the chamber to return-to-play decisions. That is concussion-protocol territory, which the owner excluded. It also gives no usage, because it does not say what the person does with a session.
- **What happens if you don't fix it:** A high school athletic trainer who handles concussion return-to-play will read this as the chamber playing a part in those decisions and push back. Nobody on the team can safely say yes to it.
- **Fix:**
  - Sports teams: `("Athletes on tournament weekends", "A rest hour between games on multi-game days.")`
  - High school and college: `("Tournament and playoff weekends", "A rest hour between games on multi-game days.")`
  - CrossFit: `("Members in a lighter week", "A rest hour in a planned deload week, alongside their coach's programming.")`

### 8. Team "Coaches and staff" rows say nothing about use, and two other rows are lists of situations
- **Where:**
  - Sports teams and clubs: "Coaches and staff", "Athletes in heavy training".
  - High school and college athletics: "Athletic trainers, coaches and staff", "Preseason and camp".
- **What's wrong:** "Your staff, who keep the same schedule the athletes do" names no use. The two training rows list situations ("two-a-days and peak training blocks") but not what a session is for. These rows could sit on any pamphlet.
- **What happens if you don't fix it:** The row fails the "what does this person use it for" test, so an athletic director cannot picture the booking.
- **Fix:**
  - Staff rows (both): "A rest hour between early mornings, long practices and late games."
  - "Athletes in heavy training": "A recovery hour between the morning and afternoon sessions of two-a-days."
  - "Preseason and camp": "A recovery hour between the morning and afternoon sessions of two-a-days."

### 9. "After a procedure" rows imply healing, and the salon row is wrong for a salon
- **Where:**
  - Recovery studios and med spas: "Aesthetic clients" and "Clients booking a reset" ("poor sleep").
  - Salons and beauty studios: "Clients after cosmetic procedures".
- **What's wrong:**
  - "Clients recovering after a procedure" claims the chamber aids post-procedure healing. "With their provider's approval" does not remove that claim.
  - A hair or nail salon has no provider relationship to cite.
  - "Poor sleep" invites an insomnia reading.
- **What happens if you don't fix it:** This is a healing claim a state board or regulator reads as medical. The salon owner also has nobody who can give approval.
- **Fix:**
  - Med spa: `("Spa-day clients", "A quiet hour of rest paired with a facial, body or other spa service.")`
  - Salons: `("Clients between appointments", "A rest hour between a cut and a facial in one visit.")`
  - Reset row: "A quiet hour of rest after travel or a busy week."

### 10. Physical therapy and chiropractic: three rows are not usage, and one invites a referral problem
- **Where:** Physical therapy and chiropractic clinics: "Clients your providers suggest it to", "Clients who have finished care", "Staff and family".
- **What's wrong:**
  - "Clients your providers suggest it to" is the clinic recommending a paid product it profits from. A licensed provider's board or compliance counsel flags that.
  - "Finished care" and "Staff and family" name no use.
  - "Family" brings minors into a clinic-run waiver.
- **What happens if you don't fix it:** The clinic owner's first objection is "I cannot recommend a product I earn from to my patients." The rows then fail the genre test.
- **Fix:**
  - Replace row 4 with `("People who wait", "Parents, spouses and training partners who come to visits and book a session while they wait.")`
  - "Clients who have finished care": "People who book a monthly wellness hour after their visits end, as a standing appointment."
  - "Staff and family" becomes `("Your front desk, therapists and providers", "A rest hour on a full clinic day, at a staff rate.")`

### 11. Gyms and CrossFit: duplicate and generic rows
- **Where:**
  - Gyms and fitness centers: "Busy professionals".
  - CrossFit and performance gyms: "Competitive athletes" and "Members in a heavy block".
- **What's wrong:**
  - "Rest and a reset after long work weeks and travel" nearly repeats the studio row "Clients booking a reset" and could sit on any pamphlet.
  - The two CrossFit rows both describe people preparing for competition.
- **What happens if you don't fix it:** The rows pad the list and tell the owner nothing about their own members.
- **Fix:**
  - Gyms: `("Lunchtime and after-work members", "Members who add a quiet hour to the workout they already fit in around a long work day.")`
  - CrossFit, replace "Competitive athletes": `("Members who train twice a day", "Competitors who double up on training days and want one quiet hour between sessions.")`

### 12. "Per athlete, per month about $33" leaves out supplies
- **Where:** Both team genres. "Example: a 30-athlete roster" box, row 2.
- **What's wrong:** $979 / 30 = $32.63 is correct, but supplies at $1.30 per session add about $5.60 a month per athlete at weekly use. The label reads as the athlete's whole cost.
- **What happens if you don't fix it:** An athletic director adds the supplies line from the same page and finds the box understated the cost.
- **Fix:** Label it `"Rental per athlete, per month"`.

## Your call

- **Athletic trainer in the room.** The proposal's draft protocol (line 64) says a licensed athletic trainer must be in the room for every session. The pamphlet says staff time is "about 15 minutes per session." If a trainer must stay in the room, the staff-time bullet is wrong by 45 to 75 minutes a session and the $33 price becomes the cheap part. Decide the protocol, then fix the bullet. The pamphlet cannot carry both.
- **One pamphlet for two readers.** High school and college are one genre. The college reader gets nothing on compliance or the sports-medicine staff. The high school reader gets two lines on minors and nothing on district approval. Splitting them is cleaner but doubles the maintenance.
- **Insurer approval for under-18 use.** The proposal says it is required. Decide whether the pamphlet says so now or only in the sales conversation.
- **Clubs without a trainer.** The sports-teams genre assumes "your athletic trainer or team physician." A club coach or manager may have neither. Decide whether this genre's copy should say "your coach or trainer."
- **Keep or drop the injury list.** The owner asked for it. Item 2 is the safest wording I would stand behind. If the owner prefers the original text, add a source for "commonly" or drop the word.

## Checked and it's fine

- **Numbers:**
  - $979 a month, $200 one-time fee, $1.30 a session, 8 sessions in a 10-hour day, and $33 each (32.63) all agree across the team and business panels.
  - The business example nets $6,686 ($7,800 - $979 - $135.20 = $6,685.80).
  - "About 14 sessions covers it" holds at $75 ($979 / $75 = 13.05).
- **Forbidden words:** no mention of concussion or brain injury anywhere in the team text, and no "therapy," "treat," "cure" or "heal" in the genre rows. The back-panel disclaimer is present and correct.
- **Specific rows that work:**
  - Gyms: "Personal-training clients" (trainer adds a session as the recovery day).
  - CrossFit: "Members in a heavy block" (names the Open, a meet, a race).
  - Recovery studios: "Your recovery regulars" (add a chamber session to a sauna or cold-plunge visit).
  - Salons: "Self-care day clients" and "Event and wedding clients".
  - PT and chiropractic: "Clients who ask for more" (cash-pay add-on, separate from the plan of care).
  - Teams: "Rosters after road trips" and "Student-athletes under load".
- **Team bullets that hold:** "Your athletic trainer stays in charge" is correctly phrased and supports the wellness-only line. "No trips across town" and "One flat monthly cost" match the pricing rules. The sports-teams `notice` line is not a factual claim.
- **Rendered pages:** Both pages render without clipping or overflow. The who boxes fit their columns. The injury bullet shows as written in the code.
