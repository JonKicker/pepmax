/**
 * Static mapping of exercise IDs to fitnessprogramer.com GIF URLs.
 * Data source: azilRababe/Exercises_Dataset (MIT license)
 * https://raw.githubusercontent.com/azilRababe/Exercises_Dataset/main/gifs_data.json
 *
 * thumbnailUrl and gifUrl are identical — expo-image renders the first frame
 * as a static thumbnail when autoplay={false} is set on the consuming component.
 * Null entries mean no suitable match was found in the dataset — fallback icon shown.
 */

export interface ExerciseMedia {
  gifUrl: string;
  thumbnailUrl: string;
}

function mediaEntry(url: string): ExerciseMedia {
  return { gifUrl: url, thumbnailUrl: url };
}

export const exerciseMediaMap: Record<string, ExerciseMedia> = {
  // === CHEST ===
  // "Bench Press" exact title in dataset — Barbell Bench Press gif
  static_bench_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif'),
  static_incline_bench_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Barbell-Bench-Press.gif'),
  static_decline_bench_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/03/Decline-Barbell-Bench-Press.gif'),
  static_dumbbell_bench_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press-1.gif'),
  static_incline_db_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif'),
  static_dumbbell_fly: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Fly.gif'),
  static_cable_crossover: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif'),
  static_chest_dip: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Chest-Dips.gif'),
  static_push_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif'),
  static_machine_chest_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Press-Machine.gif'),
  static_pec_deck: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Pec-Deck-Fly.gif'),
  static_incline_cable_fly: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-dumbbell-Fly.gif'),
  static_smith_machine_bench_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Smith-Machine-Bench-Press.gif'),

  // === BACK ===
  static_barbell_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif'),
  static_pull_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif'),
  static_chin_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/03/Chin-Up.gif'),
  // "Lat Pulldown" exact — standard wide-grip version
  static_lat_pulldown: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif'),
  static_seated_cable_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif'),
  // Best match for single-arm dumbbell row
  static_dumbbell_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Dumbbell-Row.gif'),
  static_t_bar_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/t-bar-rows.gif'),
  static_face_pull: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif'),
  // "Deadlift" exact title in dataset
  static_deadlift: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif'),
  static_rack_pull: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2023/08/barbell-rack-pull.gif'),
  // "Seated Row Machine" — best machine-row match
  static_machine_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Row-Machine.gif'),
  // Best chest-supported row match using incline dumbbell row
  static_chest_supported_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Incline-Reverse-Grip-Dumbbell-Row.gif'),

  // === SHOULDERS ===
  // "Barbell Military Press (Overhead press)" in dataset
  static_overhead_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/07/Barbell-Standing-Military-Press.gif'),
  static_dumbbell_shoulder_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif'),
  static_lateral_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif'),
  static_front_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Front-Raise.gif'),
  // Bent-Over Dumbbell Rear Delt Raise With Head On Bench
  static_reverse_fly: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Dumbbell-Rear-Delt-Raise-With-Head-On-Bench.gif'),
  static_arnold_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Arnold-Press.gif'),
  static_upright_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/barbell-uprightrow.gif'),
  static_cable_lateral_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Lateral-Raise.gif'),
  // "Lever Shoulder Press" — best dedicated machine press
  static_machine_shoulder_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/Lever-Shoulder-Press.gif'),

  // === BICEPS ===
  static_barbell_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif'),
  static_dumbbell_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif'),
  static_hammer_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif'),
  static_preacher_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Preacher-Curl.gif'),
  static_concentration_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Concentration-Curl.gif'),
  static_cable_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/cable-curl.gif'),
  static_incline_dumbbell_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Incline-Dumbbell-Curl.gif'),

  // === TRICEPS ===
  // "Rope Pushdown" — best match for tricep pushdown
  static_tricep_pushdown: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Rope-Pushdown.gif'),
  // Cable Rope Overhead Triceps Extension
  static_overhead_tricep_extension: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/Cable-Rope-Overhead-Triceps-Extension.gif'),
  // Dumbbell Skull Crusher — best gif match
  static_skull_crusher: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Dumbbell-Skull-Crusher.gif'),
  static_close_grip_bench: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Close-Grip-Bench-Press.gif'),
  static_tricep_dip: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Triceps-Dips.gif'),
  static_diamond_push_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Diamond-Push-up.gif'),
  static_tricep_kickback: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Tricep-Kickback.gif'),

  // === FOREARMS ===
  // "Wrist Curl" exact — barbell version
  static_wrist_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/barbell-Wrist-Curl.gif'),
  static_reverse_wrist_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Reverse-Wrist-Curl.gif'),
  // "Farmer's Walk" exact
  static_farmer_walk: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/02/Farmers-walk_Cardio.gif'),
  // "Dead Hang" exact (PNG, still renders in expo-image)
  static_dead_hang: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/dead-hang-360x360.png'),

  // === QUADS ===
  // "Squat" exact title in dataset — barbell back squat gif
  static_barbell_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif'),
  // "Front Squat" exact
  static_front_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/front-squat.gif'),
  // "Leg Press" exact
  static_leg_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2015/11/Leg-Press.gif'),
  // "Leg Extension" exact
  static_leg_extension: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/LEG-EXTENSION.gif'),
  static_goblet_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif'),
  static_bulgarian_split_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Dumbbell-Bulgarian-Split-Squat.gif'),
  // "Barbell Hack Squats" — best barbell hack squat match
  static_hack_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hack-Squat.gif'),
  static_walking_lunge: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2023/09/dumbbell-lunges.gif'),
  // "Smith Machine Lunge" closest Smith squat match — true smith squat not in dataset
  static_smith_machine_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/07/Smith-Machine-Lunge.gif'),

  // === HAMSTRINGS ===
  // "Romanian Deadlift" exact
  static_romanian_deadlift: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif'),
  // "Leg Curl" exact
  static_leg_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Curl.gif'),
  static_stiff_leg_deadlift: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/01/Stiff-Leg-Deadlift.gif'),
  static_glute_ham_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2023/07/Glute-Ham-Raise.gif'),
  static_db_romanian_deadlift: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Romanian-Deadlift.gif'),
  static_seated_leg_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/08/Seated-Leg-Curl.gif'),
  // "Lying Dumbbell Leg Curl" — best lying leg curl match
  static_lying_leg_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/04/Lying-Dumbbell-Leg-Curl.gif'),

  // === GLUTES ===
  // "Barbell Hip Thrust" — correct barbell hip thrust gif
  static_hip_thrust: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif'),
  // "Glute Bridge" exact
  static_glute_bridge: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif'),
  static_cable_pull_through: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Cable-Pull-Through.gif'),
  // "Barbell Step-Up" — good step-up match
  static_step_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Barbell-Step-Up.gif'),
  // No glute cable kickback in dataset — falls back to icon
  // static_kickback_cable intentionally omitted — Cable-Tricep-Kickback was wrong (tricep exercise)
  // "Squat" — same barbell squat gif for deep back squat
  static_deep_back_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif'),
  // Reuse Smith Machine Lunge for glute squat variant
  static_smith_machine_glute_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/07/Smith-Machine-Lunge.gif'),
  // "Hyperextension" — matches 45-degree hip extension
  static_45_degree_hip_extension: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/hyperextension.gif'),

  // === CALVES ===
  static_standing_calf_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Standing-Calf-Raise.gif'),
  // "Lever Seated Calf Raise" — best machine seated calf raise
  static_seated_calf_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Lever-Seated-Calf-Raise.gif'),
  // "Calf Raise" exact (dumbbell version)
  static_calf_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Calf-Raise.gif'),
  static_leg_press_calf_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Leg-Press-Calf-Raise.gif'),
  static_donkey_calf_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/09/Donkey-Calf-Raise.gif'),
  // No tibialis raise gif in dataset — leave null (component shows fallback icon)

  // === CORE ===
  // "Plank" exact
  static_plank: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif'),
  // "Ab Straps Leg Raise" — closest hanging leg raise match
  static_hanging_leg_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/07/Ab-Straps-Leg-Raise.gif'),
  // "Kneeling Cable Crunch" — standard cable crunch
  static_cable_crunch: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Kneeling-Cable-Crunch.gif'),
  static_russian_twist: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif'),
  static_ab_wheel_rollout: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Ab-Wheel-Rollout.gif'),
  static_dead_bug: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Dead-Bug.gif'),
  static_mountain_climber: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Mountain-climber.gif'),
  // "Side Plank" — PNG thumbnail, GIF not available but image renders fine
  static_side_plank: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Side-Plank-1-360x360.png'),

  // === FULL BODY / COMPOUND ===
  static_clean_and_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/Barbell-Clean-and-Press-.gif'),
  static_thruster: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/10/thruster.gif'),
  static_kettlebell_swing: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/09/Kettlebell-Swings.gif'),
  static_burpee: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/burpees.gif'),
  // No man maker in dataset — omit (null fallback shown)

  // === SHOULDERS / BACK (TRAPS) ===
  static_dumbbell_shrug: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Shrug.gif'),
  // No trap bar carry in dataset — use farmer's walk as closest equivalent
  static_trap_bar_carry: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/02/Farmers-walk_Cardio.gif'),
  // No sled push in dataset — omit (null fallback shown)

  // === ADDUCTORS / ABDUCTORS ===
  // "Hip Adduction Machine" exact
  static_adductor_machine: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/HIP-ADDUCTION-MACHINE.gif'),
  static_sumo_deadlift: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/Barbell-Sumo-Deadlift.gif'),
  // Reuse Leg Press for wide-stance variant
  static_wide_stance_leg_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2015/11/Leg-Press.gif'),
  // "Cable Hip Adduction" exact
  static_cable_adduction: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Cable-Hips-Adduction.gif'),
  // "Hip Abduction Machine" exact
  static_hip_abduction_machine: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/HiP-ABDUCTION-MACHINE.gif'),
  // No cable hip abduction in dataset — use machine version as fallback
  static_standing_cable_abduction: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/HiP-ABDUCTION-MACHINE.gif'),
  // "Dumbbell Lateral Step Up" exact
  static_lateral_step_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Dumbbell-Lateral-Step-Up.gif'),

  // === TIER 1 — NEWLY MAPPED EXERCISES ===

  // === CHEST (additional) ===
  static_incline_dumbbell_fly: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-dumbbell-Fly.gif'),
  static_decline_dumbbell_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Decline-Dumbbell-Press.gif'),
  // "Barbell Floor Press" exact
  static_floor_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/07/Barbell-Floor-Press.gif'),
  // "Dumbbell Pullover" exact
  static_dumbbell_pullover: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Pullover.gif'),

  // === BACK (additional) ===
  // "Inverted Row" exact
  static_inverted_row: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Inverted-Row.gif'),
  // "Cable Straight Arm Pulldown" — best match for straight-arm pulldown
  static_straight_arm_pulldown: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Cable-Straight-Arm-Pulldown.gif'),
  // "V-bar Lat Pulldown" exact
  static_v_bar_pulldown: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/V-bar-Lat-Pulldown.gif'),
  // "Reverse Lat-Pulldown" — best match for underhand (supinated) pulldown
  static_underhand_pulldown: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/Reverse-Lat-Pulldown.gif'),
  // "Barbell Good Morning" exact
  static_good_morning: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Good-Morning.gif'),
  // "Hyperextension" exact (same as 45-degree hip extension fallback, correct for back extension)
  static_hyperextension: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/hyperextension.gif'),
  // "Superman exercise" exact
  static_superman: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Superman-exercise.gif'),
  // "Reverse Hyperextension Machine" exact
  static_reverse_hyperextension: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Reverse-Hyperextension-Machine.gif'),

  // === SHOULDERS (additional) ===
  // "Seated Rear Lateral Dumbbell Raise" — best match for seated rear delt raise
  static_seated_rear_delt_raise: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Rear-Lateral-Dumbbell-Raise.gif'),

  // === BICEPS (additional) ===
  // "Z-Bar Curl" — standard EZ-bar curl movement (no plain EZ-Bar Curl in dataset)
  static_ez_bar_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Z-Bar-Curl.gif'),
  // "Barbell Drag Curl" exact
  static_drag_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/12/Barbell-Drag-Curl.gif'),
  // "Zottman Curl" exact
  static_zottman_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/04/zottman-curl.gif'),
  // "Biceps Curl Machine" — best match for machine bicep curl
  static_machine_bicep_curl: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/09/Bicep-Curl-Machine.gif'),
  // No spider curl in dataset — falls back to icon
  // static_spider_curl intentionally omitted

  // === TRICEPS (additional) ===
  // "Reverse Grip Pushdown" exact
  static_reverse_grip_pushdown: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Reverse-Grip-Pushdown.gif'),
  // "Dumbbell Tate Press" exact
  static_tate_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/02/Dumbbell-Tate-Press.gif'),
  // "Bench Dips" exact
  static_bench_dip: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Dips.gif'),
  // No JM Press in dataset — falls back to icon
  // static_jm_press intentionally omitted

  // === QUADS (additional) ===
  // "Barbell Lunge" exact
  static_barbell_lunge: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Barbell-Lunge.gif'),
  // "Dumbbell Lunge" exact
  static_dumbbell_lunge: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif'),
  // "Bodyweight Squat" exact
  static_bodyweight_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Bodyweight-Squat.gif'),
  static_split_squat: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/05/Split-Squat.gif'),

  // === GLUTES (additional) ===
  // No single-leg glute bridge in dataset — falls back to icon
  // static_single_leg_glute_bridge intentionally omitted
  // No glute cable kickback in dataset — static_kickback_cable intentionally removed (see Task 1)

  // === TRAPS (additional) ===
  // "Barbell Shrug" exact
  static_barbell_shrug: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shrug.gif'),

  // === CORE (additional) ===
  // "Reverse Crunch" exact
  static_reverse_crunch: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Reverse-Crunch-1.gif'),
  // "Standing Cable High-To-Low Twist" — best match for cable woodchop
  static_cable_woodchop: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/06/Standing-Cable-High-To-Low-Twist.gif'),
  // "Cable Half Kneeling Pallof Press" — best match for Pallof press
  static_pallof_press: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2022/02/Cable-Half-Kneeling-Pallof-Press.gif'),
  // "Sit-ups" exact
  static_sit_up: mediaEntry('https://fitnessprogramer.com/wp-content/uploads/2021/02/Sit-ups.gif'),
  // No tibialis raise in dataset — falls back to icon
  // static_tibialis_raise intentionally omitted
  // No man maker in dataset — falls back to icon (already noted above)
  // No sled push in dataset — falls back to icon (already noted above)
};
