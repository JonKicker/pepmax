
PEPMAX
Master Product Blueprint
The All-in-One Wellness Tracking Platform

Version 1.0  •  March 2026
Tech Stack: React Native + Expo + Firebase
Integrations: Apple HealthKit  •  USDA FoodData Central

# Executive Summary
PepMax is a unified wellness tracking platform that consolidates four fragmented health domains into one cohesive experience: peptide/medication tracking, strength training, nutrition logging, and cardiovascular exercise. The app is built on the principle that health optimization is interconnected — what you inject, lift, eat, and run all affect each other.
This blueprint defines every module, screen, and feature needed to build PepMax from the ground up using React Native, Expo, and Firebase. It is designed to be executed sequentially via Claude Code, with each section serving as a standalone build prompt.
# Build Order & Release Strategy
The four modules will be built in the following sequence. Each module builds on the shared infrastructure established by its predecessor:

# Shared App Architecture
Before building any module, the following shared infrastructure must be established. Every module reads from and writes to the same unified data model.
## The Unified Day Model
At the heart of PepMax is a single daily record that all four modules contribute to. This prevents the siloed experience that plagues every competitor. Each day has: recovery context (sleep, HRV, subjective energy), medication/peptide context (active compounds, estimated blood levels), training context (volume, intensity, type), and metabolic context (calories, macros, hydration).
Firebase structure: /users/{uid}/days/{YYYY-MM-DD}/ with sub-collections for each module’s entries. This allows any screen to pull cross-module correlations without complex joins.
## Authentication & Onboarding
Firebase Auth with Apple Sign-In (required for App Store), Google Sign-In, and email/password. Onboarding flow asks the user’s primary objective (weight management, muscle building, endurance, general wellness, peptide optimization) and tailors the default dashboard layout accordingly. Unit preferences (metric/imperial) are set once and respected globally across all modules.
## Navigation Structure
Bottom tab bar with five tabs: Home (unified daily dashboard), Peptides (purple accent), Training (orange accent), Nutrition (green accent), Cardio (blue accent). Each module has its own navigation stack. The Home tab aggregates key metrics from all active modules into a single glanceable view.
## Design System
Consistent component library built before any module: cards with subtle shadows, large thumb-friendly tap targets (minimum 48dp), module-specific accent colors (purple for peptides, orange for gym, green for nutrition, blue for cardio), dark mode support from day one, and haptic feedback on key interactions. Typography uses a clean sans-serif with clear hierarchy.

MODULE 1: PEPTIDE TRACKING
From shot log to pharmacokinetic coach
## 1.1 Core Philosophy
Most peptide trackers are glorified calendars. PepMax treats peptides as time-dependent compounds with pharmacokinetic behavior. Users should understand not just WHEN they injected, but HOW MUCH active compound is estimated to be in their system at any moment, and how their symptoms correlate with those levels.
## 1.2 Compound Database & Custom Entry
Ship with presets for the most common compounds: Semaglutide, Tirzepatide, BPC-157, TB-500, CJC-1295, Ipamorelin, NAD+, and others. Each preset includes default half-life, common dosing protocols, route of administration, and storage requirements. Crucially, users can create fully custom compounds with all these fields — never lock them into a fixed database.
Fields per compound: name, category (GLP-1, GH secretagogue, healing, other), half-life (hours, with range for user adjustment), route (subcutaneous, intramuscular, oral, nasal, IV), concentration (mg/mL after reconstitution), storage temp, and notes.
## 1.3 Reconstitution Calculator
This is the single feature most competitors get wrong. The calculator must work the way users actually think:
- Input: "I have a [X mg] vial. I want [Y mg] per dose. I use a [Z unit] insulin syringe."
- Output: "Add [A mL] bacteriostatic water. Each dose = [B units] on your syringe. This vial gives you [C doses] total."
- Show both mg and volume equivalents per dose at all times
- Allow saving common reconstitution protocols as reusable templates
- Support multiple syringe types (insulin U-100, U-40, standard mL syringes)
- Visual syringe graphic showing the fill line for each dose for quick reference
## 1.4 Visual Half-Life & Accumulation Graphs
The signature feature of PepMax’s peptide module. A timeline chart shows:
- Injection events as vertical stems on a time axis
- A smooth decay curve showing estimated active compound in the system based on the compound’s half-life and the user’s dosing schedule
- For compounds with accumulation (e.g., Semaglutide), show the stacking effect over weeks
- Symptom/side-effect events overlaid on the curve (nausea, appetite changes, energy, sleep quality, injection site reactions)
- Tap any point on the curve to see estimated blood level at that moment
- Pinch to zoom between day view, week view, and full-cycle view
## 1.5 Cycle & Titration Engine
A wizard-style flow for programming multi-week protocols:
- Step 1: Select compound (from database or custom)
- Step 2: Set starting dose, dose increments, increment frequency, maximum dose, and optional taper-down schedule
- Step 3: Set injection frequency (e.g., weekly, twice weekly, daily) and preferred injection days/times
- Step 4: Review generated calendar with all planned injections, dose amounts, and cycle milestones
- Automatic rescheduling: if a user misses an injection, the system suggests adjusted dates rather than marking a failure
- Support for stacking multiple compounds on different schedules within the same cycle view
## 1.6 Inventory Management
Track supplies to prevent unexpected shortages:
- Track vials (with remaining volume), pens (remaining doses/clicks), syringes, alcohol swabs, bacteriostatic water
- "Days until empty" estimate based on current protocol consumption rate
- Low-supply alerts (configurable threshold, e.g., 7 days before running out)
- Support flexible units: mg, IU, mL, pens, vials — user picks what feels natural
- Batch/lot tracking for users who want to monitor across different supply batches
## 1.7 Symptom & Side Effect Logging
Quick-log interface for tracking how the user feels relative to their protocol:
- Pre-built symptom categories: GI (nausea, appetite, bowel changes), energy/fatigue, sleep quality, injection site (pain, redness, swelling), mood, libido, and custom
- Severity scale: 1–5 with emoji indicators for speed
- Timestamp auto-filled but editable
- These events appear directly on the half-life graph so users can visually correlate symptoms with estimated blood levels
- Weekly digest: "This week you reported nausea 3x, mostly within 24 hours of injection at peak estimated levels"
## 1.8 Screens Summary

MODULE 2: GYM / STRENGTH TRAINING
Zero-friction logging that respects your real life
## 2.1 Core Philosophy
The gym module is built around one principle: logging should take fewer seconds than your rest period. Every design decision optimizes for speed on the gym floor. The module also rejects the "all or nothing" mentality — it adapts to the user’s actual energy and schedule rather than punishing imperfect adherence.
## 2.2 Exercise Database
Ship with 300+ exercises, each tagged with: primary and secondary muscle groups, equipment required, movement pattern (push, pull, hinge, squat, carry, isolation), difficulty level, and video thumbnail reference. Users can create unlimited custom exercises with the same tagging system. Search supports both name and muscle group filtering.
## 2.3 Program Builder
Users can build custom workout programs or use templates:
- Drag-and-drop exercise ordering within a session
- Set target sets, rep ranges, RPE/RIR targets, and rest timers per exercise
- Multi-week periodization: assign different sessions to different weeks for progressive overload
- Programmable constraints: user declares "I can train 3–4 days per week, 45–60 min per session" and the planner builds around that
- If a day is missed, the system reshuffles the week intelligently rather than breaking a streak
- Unlimited saved programs (not paywalled like competitors)
## 2.4 Workout Logging (The Core UX)
The logging interface is the most performance-critical screen in the entire app. Design principles:
- Large, thumb-reachable inputs — designed for one-handed use between sets
- Default weight and reps pre-filled from last session (tap to accept, swipe to adjust)
- Auto-advance to next set after logging, with configurable rest timer that starts automatically
- "Quick Set" mode: single tap logs a set with last-used weight/reps (fill in details later)
- Swipe gestures: swipe right to complete a set, swipe left to skip/modify
- Minimal screen transitions — the entire workout flows on essentially one screen
- Auto-save every logged set to Firebase immediately (no data loss if app crashes)
## 2.5 Bare Minimum Mode
The standout feature for real-life usability. For every planned workout, PepMax pre-computes a shortened variant:
- Triggered by tapping "Low Energy" or "Short on Time" before starting a session
- Algorithm: keep compound movements, drop isolation work, reduce set volume by 30–50%, maintain intensity
- Time cap slider: user picks 15, 20, 30, or 45 minutes and the session auto-adjusts
- Completing a bare-minimum workout still counts as an "on plan" day — no broken streaks
- Post-workout summary shows what was completed vs. full plan, framed positively ("You hit 70% of planned volume — solid effort")
## 2.6 Equipment-Aware Programming
Quick toggle for different training environments:
- Preset profiles: Full Commercial Gym, Home Gym, Hotel/Travel, Bodyweight Only, or Custom
- Each profile defines available equipment (barbells, dumbbells, cables, machines, bands, etc.)
- When a profile is activated, any exercise requiring unavailable equipment shows a swap icon
- Tap swap icon to see 2–3 alternative exercises matching the same movement pattern with available equipment
- Custom profiles save the user’s specific home/garage gym setup
## 2.7 Progress Tracking & Analytics
- Estimated 1RM trends per exercise over time (Epley/Brzycki formula)
- Total weekly volume by muscle group (sets x reps x weight)
- Personal records board with date achieved
- Body measurements log (optional): weight, body fat %, circumference measurements with trend charts
- Integration with the unified day model: see how sleep, nutrition, and peptide protocols correlate with strength performance
## 2.8 Screens Summary

MODULE 3: NUTRITION TRACKING
Accurate data without the tedium
## 3.1 Core Philosophy
Nutrition logging fails when it becomes homework. PepMax’s nutrition module prioritizes verified accuracy over crowd-sourced volume, and speed of entry over exhaustive detail. It also refuses to set dangerous calorie targets — evidence-based guardrails are built in.
## 3.2 Verified Food Database (USDA Integration)
The foundation is the USDA FoodData Central API, providing lab-verified nutritional data:
- Primary data source: USDA FoodData Central (SR Legacy + Foundation Foods) via API
- Each food entry clearly labeled as "Verified" (USDA) or "Community" (user-submitted)
- Users can filter search results to show verified-only entries for high-precision logging
- Barcode scanning maps to USDA entries where available, falls back to OpenFoodFacts
- Micronutrient data included by default: vitamins, minerals, not just macros
- No duplicate garbage entries — community submissions require basic validation before appearing in search
## 3.3 Smart Meal Logging
Multiple entry methods optimized for different situations:
- Quick Search: type food name, select from verified results, adjust portion with slider
- Barcode Scanner: scan packaged foods, auto-populate all fields, user confirms portion size
- AI Photo Logging (stretch goal): snap a photo, get estimated items and portions, correct via sliders and swaps. Persist corrections as personal templates for recurring meals
- Recent & Frequent: top of every logging screen shows the user’s most-logged foods and recent entries for one-tap re-logging
- Copy Meal: duplicate an entire previous meal (e.g., "I had the same breakfast as yesterday")
## 3.4 Recipe Builder
Designed for home cooks who find logging custom meals painful:
- Add ingredients from the USDA database with amounts (weight, volume, or descriptive like "1 medium apple")
- Set total servings — app calculates per-serving nutrition automatically
- "Batch Cook" flag: mark a recipe as batch-cooked, then log individual servings as fractions over multiple days
- Save recipes for one-tap future logging
- Edit a recipe and optionally back-fill the updated nutrition to previous log entries
- Allow rough amounts — not everyone weighs every gram, and approximate logging is better than no logging
## 3.5 Evidence-Based Targets & Guardrails
PepMax never defaults to a 1,200 calorie target for an active adult. Instead:
- Calorie targets calculated from Mifflin-St Jeor BMR + activity multiplier, with a maximum recommended deficit of 500 kcal/day
- Hard floor warnings: alerts if targets fall below evidence-based minimums (1,500 for men, 1,200 for women as absolute floors, with context)
- Dynamic adjustment: if the user logs intake consistently and weight trends diverge from prediction, suggest recalibrating targets based on actual metabolic response
- Educational micro-content explaining why aggressive deficits are counterproductive long-term
- Macro split recommendations based on user’s primary objective (muscle building vs. weight loss vs. endurance) with explanations
## 3.6 Micronutrient Tracking
A key differentiator over MyFitnessPal’s macro-only approach:
- Track key vitamins (A, B-complex, C, D, E, K) and minerals (iron, calcium, magnesium, zinc, potassium, sodium) from USDA data
- Weekly averages with traffic-light indicators: green (meeting RDA), yellow (borderline), red (consistently low)
- "Focus Packs": curated nutrient sets for specific needs — Vegan (B12, iron, omega-3), Pregnancy, Athletic Performance, Bone Health, Anemia
- Don’t overwhelm by default: show macros on the main view, micronutrients accessible one tap deeper for users who want them
- Monthly trend view showing which micronutrients are consistently lacking
## 3.7 Screens Summary

MODULE 4: CARDIOVASCULAR TRACKING
Accuracy, simplicity, and effort-aware analysis
## 4.1 Core Philosophy
Cardio tracking in PepMax strips away the social clutter and gamification that dominate Strava and Nike Run Club. The focus is on accurate data capture, understanding performance in context (sleep, stress, medication), and providing a distraction-free experience during the workout itself.
## 4.2 Activity Types & Tracking Modes
- Outdoor GPS activities: running, walking, cycling, hiking — tracked via device GPS with configurable accuracy vs. battery modes
- Indoor activities: treadmill running, indoor cycling, rowing, elliptical — distance from manual input, HealthKit, or equipment sync
- Heart rate integration via Apple HealthKit (Apple Watch, chest straps, compatible devices)
- Custom activity type for anything not listed (swimming, jump rope, sports, etc.) with manual metric entry
## 4.3 GPS Accuracy & Processing
GPS quality is the most common complaint about cardio apps. PepMax addresses this:
- "Accuracy Mode" vs "Battery Saver" toggle before starting outdoor activity
- Post-activity auto-trim: detect and flag obvious GPS spikes (teleportation, impossible pace jumps) with one-tap correction
- Show accuracy confidence indicator on the map view (green = high confidence, yellow = moderate, red = GPS was unreliable)
- Allow manual distance override if the user knows their route is, for example, exactly 5K from prior measurement
- Smooth pace graph filtering to remove noise while preserving real pace changes
## 4.4 Zen Mode (Distraction-Free Workout)
A core UX differentiator:
- Minimal workout screen showing only: elapsed time, distance, current pace, and optionally heart rate
- No social feed, no badges, no notifications from other app modules during the session
- Auto-enable Do Not Disturb (with user permission) for the duration of the workout
- Large, high-contrast numbers readable in bright sunlight or dim conditions
- Audio cues for mile/km splits and heart rate zone changes (configurable or off entirely)
- One large "Stop" button to end — no complex multi-tap confirmation during cooldown
## 4.5 Effort vs. Performance Analysis
The insight layer that connects cardio to the unified day model:
- Effort Score: composite of previous night’s sleep quality, resting HR, HRV (from HealthKit), and subjective stress rating
- Performance-in-context view: "Your pace was 8:30/mi on an effort score of 62/100 — this is strong relative to your recovery state"
- Trend chart: plot pace/speed at a given heart rate over weeks to show genuine fitness improvement vs. just running harder
- Cross-module correlation: show how nutrition intake, peptide schedule, and training load from the gym module affect cardio performance
- Weekly training load balance: visualize how much strain came from lifting vs. cardio to help the user manage total CNS fatigue
## 4.6 Indoor/Outdoor Unified View
Indoor and outdoor activities feed into a single fitness model:
- Estimated aerobic fitness score (VO2max-style) that incorporates both indoor and outdoor data
- Pace-at-heart-rate tracking works for both modalities
- Indoor sessions log to the same training calendar and weekly volume as outdoor runs
- No second-class treatment of treadmill sessions — they’re full citizens in all charts and analytics
## 4.7 Route Library (Stretch Feature)
- Save completed routes with tags: "tempo 5K", "hilly long run", "recovery loop"
- Estimated completion time based on user’s current fitness for each saved route
- Basic route planning: set a target distance and direction, app suggests a loop (requires mapping API integration)
- Elevation profile display for saved routes
## 4.8 Screens Summary

UNIFIED HOME DASHBOARD
The single screen that ties everything together
## 5.1 Daily Overview Cards
The Home tab presents a vertically scrolling dashboard of cards, one per active module, plus cross-cutting insights:
- Peptide Card: next scheduled dose, current estimated active level, days until resupply needed
- Training Card: today’s scheduled workout (or rest day), weekly volume completed vs. planned
- Nutrition Card: calories remaining today, macro progress bars, hydration status
- Cardio Card: weekly distance/time progress toward goal, last activity summary
- Recovery Card: sleep quality, subjective energy score, combined training load from all sources
## 5.2 Smart Insights Engine
Because all data lives in the unified day model, PepMax can surface insights no single-purpose app can:
- "Your strength has increased 12% since starting your current peptide cycle 6 weeks ago"
- "You tend to undereat by ~400 kcal on heavy lifting days — consider adding a post-workout meal"
- "Your cardio performance dips significantly the day after injection — consider scheduling easy runs on those days"
- "You’ve missed protein targets 4 of the last 7 days — this may limit your recovery from this week’s training volume"
- These are calculated locally from user data, not AI-generated speculation — every insight cites the specific data points behind it
## 5.3 Flexible Consistency Metrics
PepMax replaces brittle streak counters with forgiving consistency metrics:
- "X of last Y days on plan" instead of "streak of Z consecutive days"
- Adapting a workout (bare minimum mode) or logging a lighter nutrition day still counts as adherent
- Weekly consistency score that doesn’t reset to zero from one off day
- Visual calendar with color-coded dots: green (fully on plan), yellow (adapted/partial), gray (rest/off), red (missed entirely) — encourages green and yellow equally

MONETIZATION & PRIVACY
Sustainable revenue without betraying user trust
## 6.1 Recommended Model
Based on community sentiment analysis, the following approach minimizes churn and negative reviews:

The strong recommendation is to avoid gating basic functionality (like saving more than three routines). The community backlash against this pattern is severe and well-documented. Keep core logging unlimited and free; charge for intelligence and advanced visualization.
## 6.2 Privacy as a Feature
- Clear, non-lawyer-speak privacy panel explaining exactly what data is stored, where, and why
- No selling of health data — make this an explicit, prominent commitment
- Easy full-data export (CSV and JSON) at any time — no lock-in
- Firebase security rules ensuring users can only access their own data
- Optional local-only mode for users who don’t want cloud sync (future consideration)

APPLE HEALTHKIT INTEGRATION
Two-way data sync for a complete picture
## 7.1 Data Read (From HealthKit to PepMax)
- Sleep analysis: duration and quality stages for the recovery/effort score
- Resting heart rate and HRV for effort scoring and trend analysis
- Step count for daily activity baseline
- Active energy burned for nutrition target adjustment
- Workout sessions from Apple Watch (auto-import runs, walks, cycling)
- Body weight if user logs it via Apple Health or a connected smart scale
## 7.2 Data Write (From PepMax to HealthKit)
- Nutrition: calories, macros, and water intake logged in PepMax sync back to HealthKit
- Workouts: gym sessions and cardio activities logged in PepMax appear in Apple Health
- Body measurements: weight and body fat logged in PepMax sync to HealthKit
- This ensures PepMax plays nicely with the user’s broader health ecosystem and doesn’t create a data island

# Appendix: Firebase Data Schema Overview
Top-level structure under /users/{uid}/:

Each collection uses auto-generated Firebase document IDs. Dates use YYYY-MM-DD format for natural ordering. All timestamps stored as Firestore Timestamps for timezone-safe querying.

End of PepMax Master Blueprint v1.0. This document serves as the single source of truth for all development work. Each module section can be used as a standalone Claude Code prompt for building that module.