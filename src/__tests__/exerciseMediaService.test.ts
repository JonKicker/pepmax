/**
 * exerciseMediaService.test.ts — Unit tests for exercise media lookup.
 *
 * Pure synchronous service — no mocks needed.
 * Data source: azilRababe/Exercises_Dataset (MIT license), hosted on fitnessprogramer.com
 */

import { getExerciseMedia } from '../services/exerciseMediaService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const FITNESSPROGRAMER_BASE = 'https://fitnessprogramer.com/wp-content/uploads';

// ── getExerciseMedia ──────────────────────────────────────────────────────────

describe('getExerciseMedia', () => {
  // ── Happy path — mapped exercises ──────────────────────────────────────────

  it('returns media object for a known exercise (bench press)', () => {
    const result = getExerciseMedia('static_bench_press');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toContain(FITNESSPROGRAMER_BASE);
    expect(result!.thumbnailUrl).toContain(FITNESSPROGRAMER_BASE);
  });

  it('returns media object for a known exercise (barbell squat)', () => {
    const result = getExerciseMedia('static_barbell_squat');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toMatch(/\.(gif|png)$/i);
  });

  it('returns media object for a known exercise (deadlift)', () => {
    const result = getExerciseMedia('static_deadlift');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toContain(FITNESSPROGRAMER_BASE);
  });

  it('gifUrl and thumbnailUrl are the same string for each entry', () => {
    const result = getExerciseMedia('static_pull_up');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toBe(result!.thumbnailUrl);
  });

  it('GIF URL ends with .gif or .png', () => {
    const result = getExerciseMedia('static_overhead_press');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toMatch(/\.(gif|png)$/i);
  });

  it('URL points to fitnessprogramer.com', () => {
    const result = getExerciseMedia('static_barbell_curl');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toMatch(/^https:\/\/fitnessprogramer\.com/);
  });

  // ── Fallback — unmapped / custom exercises ──────────────────────────────────

  it('returns null for a custom exercise ID', () => {
    const result = getExerciseMedia('custom_abc123');
    expect(result).toBeNull();
  });

  it('returns null for a completely unknown ID', () => {
    const result = getExerciseMedia('nonexistent_exercise');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', () => {
    const result = getExerciseMedia('');
    expect(result).toBeNull();
  });

  // ── Exercises with no dataset match return null (graceful omission) ──────────

  it('returns null for static_tibialis_raise (no match in dataset)', () => {
    const result = getExerciseMedia('static_tibialis_raise');
    expect(result).toBeNull();
  });

  it('returns null for static_man_maker (no match in dataset)', () => {
    const result = getExerciseMedia('static_man_maker');
    expect(result).toBeNull();
  });

  it('returns null for static_sled_push (no match in dataset)', () => {
    const result = getExerciseMedia('static_sled_push');
    expect(result).toBeNull();
  });

  it('returns null for static_kickback_cable (removed — wrong muscle group mapping)', () => {
    const result = getExerciseMedia('static_kickback_cable');
    expect(result).toBeNull();
  });

  it('returns null for static_jm_press (no match in dataset)', () => {
    const result = getExerciseMedia('static_jm_press');
    expect(result).toBeNull();
  });

  it('returns null for static_spider_curl (no match in dataset)', () => {
    const result = getExerciseMedia('static_spider_curl');
    expect(result).toBeNull();
  });

  it('returns valid media for static_split_squat', () => {
    const result = getExerciseMedia('static_split_squat');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toContain('Split-Squat.gif');
  });

  it('returns null for static_single_leg_glute_bridge (no match in dataset)', () => {
    const result = getExerciseMedia('static_single_leg_glute_bridge');
    expect(result).toBeNull();
  });

  // ── Coverage — all mapped static exercises resolve to fitnessprogramer.com ──

  it('all mapped static exercise IDs resolve to fitnessprogramer.com URLs', () => {
    const mappedIds = [
      // Chest
      'static_bench_press', 'static_incline_bench_press', 'static_decline_bench_press',
      'static_dumbbell_bench_press', 'static_incline_db_press', 'static_dumbbell_fly',
      'static_cable_crossover', 'static_chest_dip', 'static_push_up',
      'static_machine_chest_press', 'static_pec_deck', 'static_incline_cable_fly',
      'static_smith_machine_bench_press',
      'static_incline_dumbbell_fly', 'static_decline_dumbbell_press',
      'static_floor_press', 'static_dumbbell_pullover',
      // Back
      'static_barbell_row', 'static_pull_up', 'static_chin_up', 'static_lat_pulldown',
      'static_seated_cable_row', 'static_dumbbell_row', 'static_t_bar_row', 'static_face_pull',
      'static_deadlift', 'static_rack_pull', 'static_machine_row', 'static_chest_supported_row',
      'static_inverted_row', 'static_straight_arm_pulldown', 'static_v_bar_pulldown',
      'static_underhand_pulldown', 'static_good_morning', 'static_hyperextension',
      'static_superman', 'static_reverse_hyperextension',
      // Shoulders
      'static_overhead_press', 'static_dumbbell_shoulder_press', 'static_lateral_raise',
      'static_front_raise', 'static_reverse_fly', 'static_arnold_press', 'static_upright_row',
      'static_cable_lateral_raise', 'static_machine_shoulder_press',
      'static_seated_rear_delt_raise',
      // Biceps
      'static_barbell_curl', 'static_dumbbell_curl', 'static_hammer_curl',
      'static_preacher_curl', 'static_concentration_curl', 'static_cable_curl',
      'static_incline_dumbbell_curl',
      'static_ez_bar_curl', 'static_drag_curl', 'static_zottman_curl',
      'static_machine_bicep_curl',
      // Triceps
      'static_tricep_pushdown', 'static_overhead_tricep_extension', 'static_skull_crusher',
      'static_close_grip_bench', 'static_tricep_dip', 'static_diamond_push_up',
      'static_tricep_kickback',
      'static_reverse_grip_pushdown', 'static_tate_press', 'static_bench_dip',
      // Forearms
      'static_wrist_curl', 'static_reverse_wrist_curl', 'static_farmer_walk',
      'static_dead_hang',
      // Quads
      'static_barbell_squat', 'static_front_squat', 'static_leg_press', 'static_leg_extension',
      'static_goblet_squat', 'static_bulgarian_split_squat', 'static_hack_squat',
      'static_walking_lunge', 'static_smith_machine_squat',
      'static_barbell_lunge', 'static_dumbbell_lunge', 'static_bodyweight_squat', 'static_split_squat',
      // Hamstrings
      'static_romanian_deadlift', 'static_leg_curl', 'static_stiff_leg_deadlift',
      'static_glute_ham_raise', 'static_db_romanian_deadlift', 'static_seated_leg_curl',
      'static_lying_leg_curl',
      // Glutes (note: static_kickback_cable removed — was wrong muscle group)
      'static_hip_thrust', 'static_glute_bridge', 'static_cable_pull_through',
      'static_step_up', 'static_deep_back_squat',
      'static_smith_machine_glute_squat', 'static_45_degree_hip_extension',
      // Calves
      'static_standing_calf_raise', 'static_seated_calf_raise', 'static_calf_raise',
      'static_leg_press_calf_raise', 'static_donkey_calf_raise',
      // Core
      'static_plank', 'static_hanging_leg_raise', 'static_cable_crunch',
      'static_russian_twist', 'static_ab_wheel_rollout', 'static_dead_bug',
      'static_mountain_climber', 'static_side_plank',
      'static_reverse_crunch', 'static_cable_woodchop', 'static_pallof_press',
      'static_sit_up',
      // Full body
      'static_clean_and_press', 'static_thruster', 'static_kettlebell_swing', 'static_burpee',
      // Traps
      'static_dumbbell_shrug', 'static_trap_bar_carry', 'static_barbell_shrug',
      // Adductors / Abductors
      'static_adductor_machine', 'static_sumo_deadlift', 'static_wide_stance_leg_press',
      'static_cable_adduction', 'static_hip_abduction_machine',
      'static_standing_cable_abduction', 'static_lateral_step_up',
    ];

    for (const id of mappedIds) {
      const result = getExerciseMedia(id);
      expect(result).not.toBeNull();
      expect(result!.gifUrl).toMatch(/^https:\/\/fitnessprogramer\.com/);
      expect(result!.gifUrl).toMatch(/\.(gif|png)$/i);
      expect(result!.gifUrl).toBe(result!.thumbnailUrl);
    }
  });

  // ── URL structure ───────────────────────────────────────────────────────────

  it('all mapped URLs point to fitnessprogramer.com/wp-content/uploads', () => {
    const result = getExerciseMedia('static_barbell_curl');
    expect(result!.gifUrl).toMatch(/^https:\/\/fitnessprogramer\.com\/wp-content\/uploads/);
  });

  it('bench press URL is the correct fitnessprogramer Barbell-Bench-Press gif', () => {
    const result = getExerciseMedia('static_bench_press');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toBe(
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif'
    );
  });

  it('romanian deadlift URL is the correct fitnessprogramer gif', () => {
    const result = getExerciseMedia('static_romanian_deadlift');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toBe(
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif'
    );
  });

  it('hip thrust URL is the correct Barbell-Hip-Thrust gif (not Single-Leg-Hip-Thrust-Jump)', () => {
    const result = getExerciseMedia('static_hip_thrust');
    expect(result).not.toBeNull();
    expect(result!.gifUrl).toBe(
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif'
    );
    expect(result!.gifUrl).not.toContain('Single-Leg-Hip-Thrust-Jump');
  });
});
