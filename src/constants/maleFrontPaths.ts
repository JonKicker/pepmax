/**
 * Anatomically accurate male front body SVG paths.
 * ViewBox: 0 0 300 600
 *
 * Design reference: Whoop / FITBOD aesthetic — dark-premium, clean muscle
 * definition, smooth cubic bezier contours.
 *
 * Proportions:
 *  - Head:     centered x=150, top ~y=22, oval 35px wide × 38px tall, slight jaw
 *  - Neck:     ~20px wide, natural taper y=82–102
 *  - Shoulders: span x=56 (left tip) to x=244 (right tip), y=108–160
 *  - Chest:    pec mass y=118–188, waist narrows to ~120px at y=244
 *  - Arms:     deltoid → bicep → forearm → wrist, end ~y=262
 *  - Hips:     ~140px wide at y=284
 *  - Quads:    sweep y=288–462
 *  - Calves:   y=464–565
 */

// ─── Outline ────────────────────────────────────────────────────────────────
//
// Three subpaths: head, torso+arms, legs.
// Each subpath is a single continuous closed shape using M...Z.

export const MALE_FRONT_OUTLINE = `
  M 150 22
  C 134 22 122 34 120 50
  C 118 64 124 76 133 82
  C 137 85 143 87 150 87
  C 157 87 163 85 167 82
  C 176 76 182 64 180 50
  C 178 34 166 22 150 22 Z

  M 141 96
  C 137 97 133 99 130 101
  C 122 104 111 109 100 116
  C 90 123 74 128 65 136
  C 58 143 56 150 56 158
  L 56 184
  C 56 194 59 202 64 208
  C 61 218 59 228 59 236
  C 59 246 62 255 68 261
  L 72 263
  L 76 263
  C 78 270 81 278 84 284
  C 87 290 93 294 100 294
  L 106 290
  L 108 263
  L 108 248
  C 112 247 118 245 124 244
  C 132 242 140 241 150 241
  C 160 241 168 242 176 244
  C 182 245 188 247 192 248
  L 192 263
  L 194 290
  L 200 294
  C 207 294 213 290 216 284
  C 219 278 222 270 224 263
  L 228 263
  L 232 261
  C 238 255 241 246 241 236
  C 241 228 239 218 236 208
  C 241 202 244 194 244 184
  L 244 158
  C 244 150 242 143 235 136
  C 226 128 210 123 200 116
  C 189 109 178 104 170 101
  C 167 99 163 97 159 96
  C 156 95 153 94 150 94
  C 147 94 144 95 141 96 Z

  M 112 290
  C 107 295 103 304 101 316
  C 98 334 96 362 95 392
  C 94 418 94 442 96 458
  C 95 468 99 478 108 482
  L 124 486
  C 125 496 127 510 129 522
  C 131 536 133 548 137 556
  C 140 563 145 566 150 566
  C 155 566 160 563 163 556
  C 167 548 169 536 171 522
  C 173 510 175 496 176 486
  L 192 482
  C 201 478 205 468 204 458
  C 206 442 206 418 205 392
  C 204 362 202 334 199 316
  C 197 304 193 295 188 290
  L 112 290 Z
`;

// ─── Muscle Regions ─────────────────────────────────────────────────────────
//
// All paths are closed (Z). Left/right are mirrored around x=150.
// 1-2px visual gaps are baked into the coordinate offsets between regions.

export const MALE_FRONT_MUSCLE_PATHS: Record<string, string> = {

  // ── Chest ──────────────────────────────────────────────────────────────────
  // Two pec masses. Each originates near the clavicle and sweeps under the
  // armpit before tapering to the sternum (x≈148/152).
  // Left pec (viewer's left = body's right):
  //   top edge: x=113→148 at y=120
  //   outer edge hugs the shoulder, inner edge runs down sternum
  //   bottom curves under to y=188
  chest: `
    M 114 122
    C 120 116 132 114 148 118
    C 148 124 148 132 148 140
    C 148 156 147 172 146 182
    C 143 188 138 192 132 190
    C 124 188 117 182 114 172
    C 111 162 110 148 114 122 Z

    M 186 122
    C 180 116 168 114 152 118
    C 152 124 152 132 152 140
    C 152 156 153 172 154 182
    C 157 188 162 192 168 190
    C 176 188 183 182 186 172
    C 189 162 190 148 186 122 Z
  `,

  // ── Shoulders (deltoids) ───────────────────────────────────────────────────
  // Left deltoid: wraps the shoulder joint from clavicle to lateral humerus.
  // Origin at trapezius (x≈115, y≈112), sweeps out to the acromion (x≈72, y≈132)
  // and curves down to the deltoid insertion (x≈84, y≈158).
  leftShoulder: `
    M 76 130
    C 78 118 92 108 108 112
    C 112 120 114 132 114 146
    C 113 156 110 164 105 168
    C 97 172 87 170 80 162
    C 74 154 72 142 76 130 Z
  `,

  // Right deltoid — mirror of left around x=150
  rightShoulder: `
    M 224 130
    C 222 118 208 108 192 112
    C 188 120 186 132 186 146
    C 187 156 190 164 195 168
    C 203 172 213 170 220 162
    C 226 154 228 142 224 130 Z
  `,

  // ── Biceps ─────────────────────────────────────────────────────────────────
  // Left bicep: from just below the delt insertion (~y=160) to the elbow (~y=258).
  // Outer (lateral) edge follows the arm outline.
  // Inner (medial) edge runs along the inside of the upper arm.
  leftBicep: `
    M 74 162
    C 68 172 62 192 60 214
    C 59 232 61 248 69 256
    C 74 261 82 262 90 256
    C 97 250 99 232 99 210
    C 99 184 97 166 92 158
    C 86 152 78 154 74 162 Z
  `,

  // Right bicep — mirror
  rightBicep: `
    M 226 162
    C 232 172 238 192 240 214
    C 241 232 239 248 231 256
    C 226 261 218 262 210 256
    C 203 250 201 232 201 210
    C 201 184 203 166 208 158
    C 214 152 222 154 226 162 Z
  `,

  // ── Core (Abdominals) ──────────────────────────────────────────────────────
  // Runs from bottom of pec mass (~y=192) to hip crease (~y=244).
  // Flanks taper inward to suggest obliques. The outline suggests 6-pack mass
  // without individual row paths (those would be separate detail overlays).
  core: `
    M 122 192
    C 130 190 140 189 150 189
    C 160 189 170 190 178 192
    C 180 204 181 218 180 230
    C 178 238 173 244 165 245
    L 155 247
    L 150 248
    L 145 247
    L 135 245
    C 127 244 122 238 120 230
    C 119 218 120 204 122 192 Z
  `,

  // ── Quads ──────────────────────────────────────────────────────────────────
  // Left quad: rectus femoris + vastus lateralis sweep from hip crease (~y=292)
  // to just above the knee (~y=460). The outer edge sweeps wide for VMO/VL bulk,
  // then tapers sharply at the knee.
  leftQuad: `
    M 107 292
    C 104 302 100 318 98 344
    C 96 378 95 416 97 442
    C 99 454 106 462 116 460
    C 126 458 135 450 138 436
    C 141 416 141 376 140 344
    C 139 318 136 300 132 292
    L 107 292 Z
  `,

  // Right quad — mirror
  rightQuad: `
    M 193 292
    C 196 302 200 318 202 344
    C 204 378 205 416 203 442
    C 201 454 194 462 184 460
    C 174 458 165 450 162 436
    C 159 416 159 376 160 344
    C 161 318 164 300 168 292
    L 193 292 Z
  `,

  // ── Calves (front tibialis / gastrocnemius visible edge) ──────────────────
  // Left calf front: from knee (~y=464) to ankle (~y=562).
  // The outer edge shows the gastrocnemius belly peaking around y=505,
  // then the soleus taper to the ankle.
  leftCalfFront: `
    M 109 466
    C 106 480 103 502 104 522
    C 106 538 112 551 120 555
    C 128 558 136 554 140 546
    C 144 536 144 512 142 484
    C 141 474 137 467 132 466
    L 109 466 Z
  `,

  // Right calf front — mirror
  rightCalfFront: `
    M 191 466
    C 194 480 197 502 196 522
    C 194 538 188 551 180 555
    C 172 558 164 554 160 546
    C 156 536 156 512 158 484
    C 159 474 163 467 168 466
    L 191 466 Z
  `,
};
