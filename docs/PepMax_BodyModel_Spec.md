
PEPMAX
Body Model & Recovery System
Design Specification v1.0
March 2026  •  Supplement to Master Blueprint

Every muscle group. Every body system. One unified score.

# 1. System Overview
The Body Model is PepMax’s capstone feature — a visual, interactive representation of the user’s entire physical state. It takes data from all four modules (Peptides, Gym, Nutrition, Cardio) plus daily recovery inputs and produces two things:
- Zone Scores: Individual scores (0–100) for each muscle group and body system, representing current recovery/readiness state.
- Synergy Score: A single composite score (0–100) reflecting overall wellness, calculated from all zone scores weighted by importance and current user goals.

The Body Model is split-agnostic. It does not assume any particular training split or schedule. It simply tracks what was trained, what was eaten, what was injected, and how the user slept — then scores each zone based on the data it actually has.

# 2. Zone Definitions
The body is divided into two categories: Musculoskeletal Zones (scored from gym training data) and Body Systems (scored from cross-module data). Each zone operates independently with its own scoring logic.
## 2.1 Musculoskeletal Zones (13 Zones)
These zones map directly to the muscle group tags in the exercise database. When a user logs an exercise, the app already knows which muscles were hit (primary and secondary). This is the data source — no new input required from the user.


## 2.2 Body Systems (5 Zones)
These zones don’t map to a single exercise — they’re derived from cross-module data. Each system pulls from multiple data sources to build its score.


# 3. Scoring Logic
Every zone produces a score from 0 to 100. The meaning is consistent everywhere:


## 3.1 Musculoskeletal Zone Scoring
Muscle zone scores are driven by a fatigue-and-recovery model. When you train a muscle, its score drops. Over time, it recovers back toward 100. The key variables:

### Fatigue Impact (How Much the Score Drops)
The drop is calculated from the training stimulus to that zone on a given day:
- Volume: Total sets hitting that zone. Each set contributes fatigue. Primary muscle tags contribute 100% of set fatigue; secondary muscle tags contribute 40%.
- Intensity: Heavier loads (higher RPE/RIR) cause more fatigue per set. A set at RPE 10 causes roughly 1.5x the fatigue of a set at RPE 7.
- Exercise type: Compound movements that load the zone through a large range of motion (e.g., deep squats for quads) cause more fatigue than isolation work (e.g., leg extensions for quads). A 1.2x modifier for compounds is reasonable.

Simplified fatigue formula per zone per day:
fatigueDrop = Σ (sets × muscleWeight × rpeMultiplier × compoundModifier)

Where:
- muscleWeight = 1.0 for primary muscle, 0.4 for secondary muscle
- rpeMultiplier = 0.7 at RPE 6, 0.85 at RPE 7, 1.0 at RPE 8, 1.2 at RPE 9, 1.5 at RPE 10
- compoundModifier = 1.2 for compound exercises, 1.0 for isolation

A single hard set at RPE 8 on a primary muscle might drop the score by about 5–7 points. A full session of 4 exercises hitting chest (say 12–16 total sets, mixed RPE) might drop chest from 100 to around 35–45.

### Recovery Rate (How Fast the Score Climbs Back)
After training, the zone’s score recovers over time following a curve (not linear). Recovery speed is modified by:


The recovery curve uses a logarithmic shape — fast initial recovery (first 24 hours recovers the most), slowing as it approaches full recovery. This matches real muscle physiology where the bulk of repair happens early.

### Recovery Curve Formula
currentScore = postWorkoutScore + (fatigueDrop × recoveryProgress)
recoveryProgress = 1 - e^(-hoursElapsed / (baseRecoveryHours × modifiers))
This gives a smooth curve that rises quickly at first, then asymptotically approaches full recovery. The modifiers (sleep, nutrition, etc.) stretch or compress the time constant.

## 3.2 Body System Scoring
Body systems don’t use the train-and-recover model. Instead, they’re calculated as rolling assessments based on recent data trends.

### Cardiovascular System (0–100)
Reflects the current state of aerobic fitness and cardiac readiness.


### Gastrointestinal System (0–100)
Tracks digestive comfort — especially important for peptide users where GI side effects are common.


### Nervous System / CNS (0–100)
The most important system zone — CNS fatigue affects everything else. This is also the primary driver of the old “recovery score” concept, but done properly.


### Immune / Inflammation (0–100)
An inferred score — we don’t have blood markers, so this is modeled from proxy signals that correlate with immune function.


### Metabolic System (0–100)
Reflects whether the user is fueling their body appropriately for their goals and activity level.


# 4. The Synergy Score
The Synergy Score is the single number on the Home dashboard that tells the user: “How is my body doing overall right now?” It’s a weighted composite of all 18 zones.

## 4.1 Weighting Philosophy
Not all zones are equally important for overall wellness. The weighting system reflects two principles:
- Body systems matter more than individual muscles. A depleted CNS or immune system affects your entire life. Sore triceps don’t.
- Weights adapt to user goals. A muscle-building user weights musculoskeletal zones higher. An endurance user weights cardiovascular higher. A general wellness user gets balanced weights.

## 4.2 Default Weight Distribution


## 4.3 Goal-Based Weight Adjustments


## 4.4 Synergy Score Bonuses & Penalties
Beyond the weighted average, the Synergy Score includes modifiers for holistic patterns:
- +5 Consistency Bonus: If the user has logged data across all active modules for 5+ of the last 7 days. Rewards engagement.
- +3 Balance Bonus: If no single body system is below 30 while the rest are above 70. Rewards balanced attention.
- −5 Bottleneck Penalty: If any body system is below 20. One depleted system drags everything down — this reflects real physiology.
- −3 Overtraining Signal: If the acute:chronic workload ratio exceeds 1.5x across combined gym + cardio load.

# 5. Recovery Log Redesign
The current recovery section (hours slept + energy emoji) is replaced with a structured daily check-in that feeds the Body Model. This should take under 30 seconds to complete.

## 5.1 Daily Recovery Inputs


## 5.2 HealthKit Auto-Fill
When HealthKit is connected, auto-populate where possible:
- Sleep duration: Pull from Apple Health sleep analysis. Show as pre-filled but editable (user might want to override if HealthKit missed a nap).
- Sleep quality: If HealthKit provides sleep stages, calculate a quality estimate. Otherwise, leave for manual input.
- Resting HR & HRV: Pull automatically in the background — don’t surface as manual inputs, just use for scoring.
The recovery log should never feel like a medical questionnaire. Pre-fill what you can, keep manual inputs to quick taps and slides.

# 6. Data Sources by Module
This maps exactly what data each module contributes to the Body Model. When building each module, these are the data points that need to be captured and stored in the day model.

## 6.1 Peptide Module → Body Model
- Injection logs: Compound, dose, timestamp, site. Used for GI correlation (timing vs symptoms) and immune/inflammation modeling.
- Symptom logs: Type, severity, timestamp. Primary input for GI score. Also feeds Immune score (fatigue, illness symptoms).
- Active compound levels: Estimated blood levels from half-life calculations. Used as context overlay on the body model (e.g., “You’re at peak Semaglutide levels — GI sensitivity is expected”).
- Cycle phase: Where the user is in their protocol. Early titration phases may have predictably lower GI scores.

## 6.2 Gym Module → Body Model
- Exercise logs: Exercise name (with muscle tags), sets, reps, weight, RPE. This is the primary driver of all 13 musculoskeletal zone scores.
- Session volume: Total sets, total tonnage. Feeds the acute:chronic workload ratio for CNS and Immune scores.
- Training frequency per zone: How often each muscle group is being hit. Used to determine which zones are “active” for Synergy Score calculation.

## 6.3 Nutrition Module → Body Model
- Daily calories: Actual vs target. Feeds Metabolic score and modifies muscle recovery rate.
- Protein intake: Grams consumed vs target. Directly modifies muscle recovery speed. Feeds Metabolic score.
- Macro breakdown: Carbs, fat, protein ratios. Feeds Metabolic score.
- Micronutrient levels: Weekly averages for key vitamins and minerals (C, D, zinc, iron, magnesium). Feeds Immune score.
- Hydration: Daily water intake. Feeds GI and Metabolic scores.
- Meal timing: Timestamps of meals logged. Consistency metric feeds Metabolic score.

## 6.4 Cardio Module → Body Model
- Session data: Type, duration, distance, average pace, average HR. Primary driver of Cardiovascular system score.
- Training load: Effort-weighted cardio volume. Combined with gym load for CNS acute:chronic ratio.
- Pace-at-HR trends: Performance efficiency over time. Feeds Cardiovascular score’s fitness improvement component.

## 6.5 Recovery Log → Body Model
- Sleep duration + quality: Modifies every muscle zone’s recovery rate. Primary input for CNS score. Feeds Immune score.
- Muscle soreness: Sanity check against modeled muscle fatigue. Feeds CNS score.
- Stress level: Feeds CNS score directly.
- Overall readiness: Calibration signal used to tune individual zone confidence. If user says 9/10 but model says CNS is 40, something may need adjustment.

## 6.6 HealthKit → Body Model
- Resting heart rate: Feeds Cardiovascular score. Elevated RHR above baseline is a recovery red flag.
- Heart rate variability: Feeds CNS and Cardiovascular scores. Best objective recovery indicator available.
- Sleep stages: Enhances sleep quality estimate beyond subjective rating.
- Step count: Background activity factor. Can adjust daily calorie needs.

# 7. Visual Design: The Body Map
The Body Map is the main visual interface for the Body Model. It’s an anatomical silhouette with color-coded zones.

## 7.1 Layout
- Full-screen body silhouette (front view by default, swipe for rear view)
- Each of the 13 musculoskeletal zones is a tappable region on the silhouette
- Zones are color-coded using the score range colors (green through red)
- Body system scores displayed as icons/badges around the silhouette perimeter (heart for cardio, stomach for GI, brain for CNS, shield for immune, flame for metabolic)
- Synergy Score displayed prominently at the top center as a large circular gauge

## 7.2 Interactions
- Tap a muscle zone: Expand to show the zone’s score, last trained date, estimated full recovery date, and a mini recovery curve chart.
- Tap a system badge: Expand to show the system’s score breakdown — which inputs are pulling it up or down.
- Tap the Synergy Score: Expand to a breakdown view showing all 18 zones as a sortable list, ranked by current score. Highlights the weakest zones as “bottlenecks.”
- Swipe left/right: Toggle between front and rear body view.
- Time scrubber: Drag a timeline slider to see how the body map looked on previous days (scores are recalculated historically).

## 7.3 Smart Recommendations
Based on the current body map state, surface actionable suggestions:
- “Your quads and hamstrings are still recovering (scores 35, 42). Consider an upper body or rest day.”
- “Your CNS score has been below 50 for 3 days. Prioritize sleep and consider a deload.”
- “CNS and GI scores both dipped after your last injection. This is typical during titration — monitor and report to your provider if it persists.”
- “Your metabolic score is low because you’ve missed your protein target 4 of the last 5 days.”
Every recommendation cites specific data points. No vague “you should rest more” — always grounded in the user’s actual numbers.

# 8. Firebase Schema Additions
New data structures needed to support the Body Model, added to the existing unified day model.

### Recovery Log (New)
/users/{uid}/days/{date}/recoveryLog
{ sleepHours: number, sleepQuality: 1-5, muscleSoreness: 1-5,
stressLevel: 1-5, overallReadiness: 0-10,
notes: string, healthKitSynced: boolean,
restingHR: number?, hrv: number?, timestamp: Timestamp }
### Body Model Scores (Computed Daily)
/users/{uid}/days/{date}/bodyModel
{ synergyScore: number,
muscles: { chest: number, frontDelts: number, rearDeltsTraps: number,
latsUpperBack: number, biceps: number, triceps: number,
forearms: number, coreAbs: number, lowerBackErectors: number,
quads: number, hamstrings: number, glutes: number, calves: number },
systems: { cardiovascular: number, gastrointestinal: number,
nervousSystem: number, immune: number, metabolic: number },
bonuses: { consistency: number, balance: number, bottleneck: number },
computedAt: Timestamp }
Body model scores are recomputed whenever new data is logged (workout completed, meal logged, recovery check-in submitted). Scores are cached in Firestore so the body map renders instantly without recomputation on every screen load.

# 9. Build Order & Dependencies
The Body Model cannot be built all at once. It layers in as each module comes online.


Key insight: the Body Model starts providing value from Phase 1. Even with just recovery inputs and symptom logs, users get a CNS score and GI score. It gets richer with every module added, but it’s never an all-or-nothing feature.

## 9.1 Immediate Next Step
Rebuild the Recovery Log screen as specified in Section 5. This is the foundation that everything else builds on, and it’s a standalone improvement to the current app regardless of whether the full Body Model is built yet.
The recovery log data structure (Section 8) should be implemented now so that all future modules can read from it.