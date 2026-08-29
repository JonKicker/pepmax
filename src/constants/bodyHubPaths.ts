/**
 * SVG path data for the Body Hub screen.
 * ViewBox: 0 0 300 600
 * Sex-specific muscular anatomical silhouettes with separate muscle region paths.
 *
 * Male:  broader shoulders (~170px span), V-taper, defined pecs, visible abs,
 *        fuller arms, quad sweep, defined calves.
 * Female: narrower shoulders (~150px span), hourglass (110px waist, 155px hips),
 *         proportional chest, toned arms, feminine leg proportions.
 *
 * All pre-existing exports (organ paths, measurement points, injection zones,
 * cardio leg regions, REGION_TO_MUSCLE mapping) are unchanged.
 */

import type { MeasurementPoint } from '../types/bodyHub';

// ─── Male Body Outline ───────────────────────────────────────────────────────

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

export const MALE_BACK_OUTLINE = `
  M 150 22
  C 126 22 112 37 112 54
  C 112 72 129 86 150 86
  C 171 86 188 72 188 54
  C 188 37 174 22 150 22 Z

  M 150 86
  C 145 89 140 93 138 98
  C 124 101 110 108 97 118
  C 90 123 78 127 68 132
  C 55 138 46 148 44 160
  C 43 165 43 170 44 175
  L 44 202
  C 44 212 47 222 52 228
  C 50 234 48 241 48 248
  C 47 262 52 274 64 280
  C 67 282 70 283 74 283
  L 76 252
  C 78 264 82 276 87 283
  C 91 289 99 294 108 293
  L 111 290
  L 112 252
  L 188 252
  L 189 290
  L 192 293
  C 201 294 209 289 213 283
  C 218 276 222 264 224 252
  L 226 283
  C 230 283 233 282 236 280
  C 248 274 253 262 252 248
  C 252 241 250 234 248 228
  C 253 222 256 212 256 202
  L 256 175
  C 257 170 257 165 256 160
  C 254 148 245 138 232 132
  C 222 127 210 123 203 118
  C 190 108 176 101 162 98
  C 160 93 155 89 150 86 Z

  M 112 293
  C 105 298 101 307 100 318
  C 97 340 96 372 96 404
  C 95 432 96 455 97 468
  C 96 482 101 494 112 498
  L 128 502
  C 129 514 131 527 133 538
  C 135 550 138 558 145 561
  L 156 561
  C 163 558 166 550 168 538
  C 170 527 172 514 173 502
  L 189 498
  C 200 494 205 482 204 468
  C 205 455 206 432 205 404
  C 205 372 204 340 201 318
  C 200 307 196 298 189 293
  L 112 293 Z
`;

// ─── Male Front Muscle Paths ─────────────────────────────────────────────────

export const MALE_FRONT_MUSCLE_PATHS: Record<string, string> = {
  // Chest — two pec masses, origin near clavicle, sweep under armpit to sternum
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
  // Left Shoulder (deltoid) — wraps shoulder joint from clavicle to lateral humerus
  leftShoulder: `
    M 76 130
    C 78 118 92 108 108 112
    C 112 120 114 132 114 146
    C 113 156 110 164 105 168
    C 97 172 87 170 80 162
    C 74 154 72 142 76 130 Z
  `,
  // Right Shoulder (deltoid) — mirror of left around x=150
  rightShoulder: `
    M 224 130
    C 222 118 208 108 192 112
    C 188 120 186 132 186 146
    C 187 156 190 164 195 168
    C 203 172 213 170 220 162
    C 226 154 228 142 224 130 Z
  `,
  // Left Bicep — from below delt insertion to elbow
  leftBicep: `
    M 74 162
    C 68 172 62 192 60 214
    C 59 232 61 248 69 256
    C 74 261 82 262 90 256
    C 97 250 99 232 99 210
    C 99 184 97 166 92 158
    C 86 152 78 154 74 162 Z
  `,
  // Right Bicep — mirror
  rightBicep: `
    M 226 162
    C 232 172 238 192 240 214
    C 241 232 239 248 231 256
    C 226 261 218 262 210 256
    C 203 250 201 232 201 210
    C 201 184 203 166 208 158
    C 214 152 222 154 226 162 Z
  `,
  // Core / Abs — from bottom of pec mass to hip crease, flanks taper for obliques
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
  // Left Quad — rectus femoris + vastus lateralis sweep, hip crease to knee
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
  // Right Quad — mirror
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
  // Left Calf (front) — gastroc belly peaking, soleus taper to ankle
  leftCalfFront: `
    M 109 466
    C 106 480 103 502 104 522
    C 106 538 112 551 120 555
    C 128 558 136 554 140 546
    C 144 536 144 512 142 484
    C 141 474 137 467 132 466
    L 109 466 Z
  `,
  // Right Calf (front) — mirror
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

// ─── Male Back Muscle Paths ──────────────────────────────────────────────────

export const MALE_BACK_MUSCLE_PATHS: Record<string, string> = {
  // Upper Back — trap diamond with rhomboid detail, lat flare
  upperBack: `
    M 116 112
    C 128 106 139 103 150 103
    C 161 103 172 106 184 112
    C 190 128 190 150 186 162
    C 178 172 165 178 150 178
    C 135 178 122 172 114 162
    C 110 150 110 128 116 112 Z
  `,
  // Lower Back / Lats — lat spread from armpit to hip
  lowerBack: `
    M 109 165
    C 118 172 133 176 150 176
    C 167 176 182 172 191 165
    C 194 188 196 214 194 234
    C 190 255 172 266 150 266
    C 128 266 110 255 106 234
    C 104 214 106 188 109 165 Z
  `,
  // Left Rear Delt — full posterior cap
  leftRearDelt: `
    M 72 124
    C 77 112 95 104 111 112
    C 113 126 112 144 109 156
    C 100 161 89 158 80 149
    C 74 141 70 133 72 124 Z
  `,
  // Right Rear Delt — full posterior cap
  rightRearDelt: `
    M 228 124
    C 223 112 205 104 189 112
    C 187 126 188 144 191 156
    C 200 161 211 158 220 149
    C 226 141 230 133 228 124 Z
  `,
  // Left Tricep — horseshoe shape, long head prominent
  leftTricep: `
    M 70 158
    C 64 168 58 188 57 210
    C 57 228 60 244 68 250
    C 75 255 85 250 91 241
    C 96 232 97 210 96 168
    C 91 156 80 152 70 158 Z
  `,
  // Right Tricep — horseshoe shape, long head prominent
  rightTricep: `
    M 230 158
    C 236 168 242 188 243 210
    C 243 228 240 244 232 250
    C 225 255 215 250 209 241
    C 204 232 203 210 204 168
    C 209 156 220 152 230 158 Z
  `,
  // Left Glute — rounded with gluteal fold detail
  leftGlute: `
    M 107 264
    C 103 273 101 284 101 294
    C 101 314 108 334 120 340
    C 129 344 140 340 146 332
    C 150 325 151 312 150 293
    C 149 280 146 271 140 267
    C 131 262 114 260 107 264 Z
  `,
  // Right Glute — rounded with gluteal fold detail
  rightGlute: `
    M 193 264
    C 197 273 199 284 199 294
    C 199 314 192 334 180 340
    C 171 344 160 340 154 332
    C 150 325 149 312 150 293
    C 151 280 154 271 160 267
    C 169 262 186 260 193 264 Z
  `,
  // Left Hamstring — full biceps femoris + semitendinosus sweep
  leftHamstring: `
    M 104 340
    C 101 358 98 386 97 415
    C 96 439 97 457 103 469
    C 108 478 117 480 126 476
    C 135 471 140 460 141 442
    C 143 416 142 378 141 342
    C 140 330 135 321 128 321
    C 117 321 108 330 104 340 Z
  `,
  // Right Hamstring — full biceps femoris + semitendinosus sweep
  rightHamstring: `
    M 196 340
    C 199 358 202 386 203 415
    C 204 439 203 457 197 469
    C 192 478 183 480 174 476
    C 165 471 160 460 159 442
    C 157 416 158 378 159 342
    C 160 330 165 321 172 321
    C 183 321 192 330 196 340 Z
  `,
  // Left Calf (back) — gastroc & soleus definition
  leftCalfBack: `
    M 106 470
    C 103 484 101 505 103 524
    C 105 538 111 549 118 552
    C 125 554 132 551 136 544
    C 139 534 139 510 137 482
    C 136 473 133 467 130 466
    L 106 470 Z
  `,
  // Right Calf (back) — gastroc & soleus definition
  rightCalfBack: `
    M 194 470
    C 197 484 199 505 197 524
    C 195 538 189 549 182 552
    C 175 554 168 551 164 544
    C 161 534 161 510 163 482
    C 164 473 167 467 170 466
    L 194 470 Z
  `,
};

// ─── Female Body Outline ─────────────────────────────────────────────────────

export const FEMALE_FRONT_OUTLINE = `
  M 150 22
  C 128 22 116 36 116 52
  C 116 70 131 84 150 84
  C 169 84 184 70 184 52
  C 184 36 172 22 150 22 Z

  M 150 84
  C 146 87 143 91 142 96
  C 134 98 126 102 118 109
  C 112 113 102 118 94 122
  C 83 126 75 134 75 144
  C 74 148 74 153 74 158
  L 74 180
  C 74 188 76 195 79 200
  C 77 208 76 216 77 220
  C 77 229 80 237 87 241
  L 95 243
  C 97 252 99 261 101 267
  C 104 273 110 277 117 277
  L 120 273
  L 120 243
  L 180 243
  L 180 273
  L 183 277
  C 190 277 196 273 199 267
  C 201 261 203 252 205 243
  L 213 241
  C 220 237 223 229 223 220
  C 224 216 223 208 221 200
  C 224 195 226 188 226 180
  L 226 158
  C 226 153 226 148 225 144
  C 225 134 217 126 206 122
  C 198 118 188 113 182 109
  C 174 102 166 98 158 96
  C 157 91 154 87 150 84 Z

  M 122 277
  C 114 281 111 290 110 299
  C 108 320 107 352 106 383
  C 105 412 105 430 106 442
  C 105 455 110 466 121 469
  L 136 473
  C 137 483 139 496 140 508
  C 141 520 142 530 143 539
  C 145 550 148 558 153 560
  L 161 560
  C 165 557 168 548 170 539
  C 171 530 172 520 173 508
  C 174 496 176 483 177 473
  L 192 469
  C 203 466 208 455 207 442
  C 208 430 208 412 207 383
  C 206 352 205 320 203 299
  C 202 290 199 281 191 277
  L 122 277 Z
`;

export const FEMALE_BACK_OUTLINE = `
  M 150 22
  C 128 22 116 36 116 52
  C 116 70 131 84 150 84
  C 169 84 184 70 184 52
  C 184 36 172 22 150 22 Z

  M 150 84
  C 146 87 143 91 142 96
  C 134 98 126 102 118 109
  C 112 113 102 118 94 122
  C 83 126 75 134 75 144
  C 74 148 74 153 74 158
  L 74 180
  C 74 188 76 195 79 200
  C 77 208 76 216 77 220
  C 77 229 80 237 87 241
  L 95 243
  C 97 252 99 261 101 267
  C 104 273 110 277 117 277
  L 120 273
  L 120 243
  L 180 243
  L 180 273
  L 183 277
  C 190 277 196 273 199 267
  C 201 261 203 252 205 243
  L 213 241
  C 220 237 223 229 223 220
  C 224 216 223 208 221 200
  C 224 195 226 188 226 180
  L 226 158
  C 226 153 226 148 225 144
  C 225 134 217 126 206 122
  C 198 118 188 113 182 109
  C 174 102 166 98 158 96
  C 157 91 154 87 150 84 Z

  M 122 277
  C 114 281 111 290 110 299
  C 108 320 107 352 106 383
  C 105 412 105 430 106 442
  C 105 455 110 466 121 469
  L 136 473
  C 137 483 139 496 140 508
  C 141 520 142 530 143 539
  C 145 550 148 558 153 560
  L 161 560
  C 165 557 168 548 170 539
  C 171 530 172 520 173 508
  C 174 496 176 483 177 473
  L 192 469
  C 203 466 208 455 207 442
  C 208 430 208 412 207 383
  C 206 352 205 320 203 299
  C 202 290 199 281 191 277
  L 122 277 Z
`;

// ─── Female Front Muscle Paths ───────────────────────────────────────────────

export const FEMALE_FRONT_MUSCLE_PATHS: Record<string, string> = {
  // Chest — proportional pec region, less blocky than male
  chest: `
    M 118 138
    C 124 128 136 121 149 122
    C 148 127 148 134 148 140
    C 148 155 148 170 147 177
    C 144 183 140 186 135 185
    C 127 184 121 179 119 172
    C 116 163 116 150 118 138 Z

    M 182 138
    C 176 128 164 121 151 122
    C 152 127 152 134 152 140
    C 152 155 152 170 153 177
    C 156 183 160 186 165 185
    C 173 184 179 179 181 172
    C 184 163 184 150 182 138 Z
  `,
  // Left Shoulder — slimmer deltoid cap
  leftShoulder: `
    M 90 120
    C 94 110 108 103 120 111
    C 122 122 122 138 120 149
    C 112 153 103 151 96 143
    C 91 136 87 128 90 120 Z
  `,
  // Right Shoulder — slimmer deltoid cap
  rightShoulder: `
    M 210 120
    C 206 110 192 103 180 111
    C 178 122 178 138 180 149
    C 188 153 197 151 204 143
    C 209 136 213 128 210 120 Z
  `,
  // Left Bicep — slimmer, toned
  leftBicep: `
    M 82 153
    C 77 162 73 179 72 198
    C 72 215 75 228 82 233
    C 88 237 95 235 100 228
    C 104 220 105 202 104 164
    C 100 153 91 149 82 153 Z
  `,
  // Right Bicep — slimmer, toned
  rightBicep: `
    M 218 153
    C 223 162 227 179 228 198
    C 228 215 225 228 218 233
    C 212 237 205 235 200 228
    C 196 220 195 202 196 164
    C 200 153 209 149 218 153 Z
  `,
  // Core — defined but softer contour than male
  core: `
    M 127 187
    C 134 185 142 184 150 184
    C 158 184 166 185 173 187
    C 174 200 175 218 173 234
    C 171 242 165 246 158 245
    L 150 247
    L 142 245
    C 135 246 129 242 127 234
    C 125 218 126 200 127 187 Z
  `,
  // Left Quad — feminine teardrop, slightly narrower
  leftQuad: `
    M 116 280
    C 113 290 110 305 109 328
    C 107 366 107 405 109 428
    C 112 439 119 445 128 442
    C 138 440 144 432 146 420
    C 148 398 148 360 147 327
    C 146 305 143 290 140 280
    L 116 280 Z
  `,
  // Right Quad — feminine teardrop, slightly narrower
  rightQuad: `
    M 184 280
    C 187 290 190 305 191 328
    C 193 366 193 405 191 428
    C 188 439 181 445 172 442
    C 162 440 156 432 154 420
    C 152 398 152 360 153 327
    C 154 305 157 290 160 280
    L 184 280 Z
  `,
  // Left Calf (front) — defined but slimmer
  leftCalfFront: `
    M 117 460
    C 115 474 113 494 115 512
    C 117 526 122 536 128 538
    C 134 540 139 537 142 530
    C 145 520 145 498 143 472
    C 142 464 140 458 138 457
    L 117 460 Z
  `,
  // Right Calf (front) — defined but slimmer
  rightCalfFront: `
    M 183 460
    C 185 474 187 494 185 512
    C 183 526 178 536 172 538
    C 166 540 161 537 158 530
    C 155 520 155 498 157 472
    C 158 464 160 458 162 457
    L 183 460 Z
  `,
};

// ─── Female Back Muscle Paths ────────────────────────────────────────────────

export const FEMALE_BACK_MUSCLE_PATHS: Record<string, string> = {
  // Upper Back — moderate traps, less massive than male
  upperBack: `
    M 123 112
    C 133 107 141 104 150 104
    C 159 104 167 107 177 112
    C 180 124 179 143 176 154
    C 169 163 160 167 150 167
    C 140 167 131 163 124 154
    C 121 143 120 124 123 112 Z
  `,
  // Lower Back / Lats — feminine lat taper
  lowerBack: `
    M 120 160
    C 130 166 140 168 150 168
    C 160 168 170 166 180 160
    C 183 180 184 202 182 220
    C 178 240 166 250 150 250
    C 134 250 122 240 118 220
    C 116 202 117 180 120 160 Z
  `,
  // Left Rear Delt — slimmer than male
  leftRearDelt: `
    M 90 120
    C 94 110 108 103 120 111
    C 122 122 121 139 118 150
    C 110 155 100 152 93 144
    C 88 137 87 128 90 120 Z
  `,
  // Right Rear Delt — slimmer than male
  rightRearDelt: `
    M 210 120
    C 206 110 192 103 180 111
    C 178 122 179 139 182 150
    C 190 155 200 152 207 144
    C 212 137 213 128 210 120 Z
  `,
  // Left Tricep — toned, less bulky
  leftTricep: `
    M 82 153
    C 76 163 72 181 71 202
    C 71 219 74 233 82 239
    C 88 243 96 239 101 231
    C 105 223 106 202 105 164
    C 101 153 91 149 82 153 Z
  `,
  // Right Tricep — toned, less bulky
  rightTricep: `
    M 218 153
    C 224 163 228 181 229 202
    C 229 219 226 233 218 239
    C 212 243 204 239 199 231
    C 195 223 194 202 195 164
    C 199 153 209 149 218 153 Z
  `,
  // Left Glute — rounder, fuller feminine shape
  leftGlute: `
    M 119 256
    C 115 264 112 275 112 286
    C 112 308 119 328 132 335
    C 141 340 152 336 157 327
    C 161 320 162 307 161 288
    C 160 274 157 264 151 259
    C 142 254 126 252 119 256 Z
  `,
  // Right Glute — rounder, fuller feminine shape
  rightGlute: `
    M 181 256
    C 185 264 188 275 188 286
    C 188 308 181 328 168 335
    C 159 340 148 336 143 327
    C 139 320 138 307 139 288
    C 140 274 143 264 149 259
    C 158 254 174 252 181 256 Z
  `,
  // Left Hamstring — feminine proportion
  leftHamstring: `
    M 109 334
    C 107 350 104 377 103 404
    C 102 428 103 446 109 457
    C 114 466 122 468 130 464
    C 138 460 143 449 144 432
    C 146 406 145 370 144 338
    C 143 326 138 318 132 318
    C 122 318 113 326 109 334 Z
  `,
  // Right Hamstring — feminine proportion
  rightHamstring: `
    M 191 334
    C 193 350 196 377 197 404
    C 198 428 197 446 191 457
    C 186 466 178 468 170 464
    C 162 460 157 449 156 432
    C 154 406 155 370 156 338
    C 157 326 162 318 168 318
    C 178 318 187 326 191 334 Z
  `,
  // Left Calf (back) — defined but slimmer
  leftCalfBack: `
    M 117 460
    C 115 474 113 494 115 512
    C 117 526 122 536 128 538
    C 134 540 139 537 142 530
    C 145 520 145 498 143 472
    C 142 464 140 458 138 457
    L 117 460 Z
  `,
  // Right Calf (back) — defined but slimmer
  rightCalfBack: `
    M 183 460
    C 185 474 187 494 185 512
    C 183 526 178 536 172 538
    C 166 540 161 537 158 530
    C 155 520 155 498 157 472
    C 158 464 160 458 162 457
    L 183 460 Z
  `,
};

// ─── Backward-compatible aliases (default to male) ───────────────────────────

export const BODY_FRONT_OUTLINE = MALE_FRONT_OUTLINE;
export const BODY_BACK_OUTLINE = MALE_BACK_OUTLINE;
export const FRONT_MUSCLE_PATHS = MALE_FRONT_MUSCLE_PATHS;
export const BACK_MUSCLE_PATHS = MALE_BACK_MUSCLE_PATHS;

// ─── Sex-aware path resolver ─────────────────────────────────────────────────

export function getBodyPaths(sex: 'male' | 'female') {
  return {
    frontOutline: sex === 'female' ? FEMALE_FRONT_OUTLINE : MALE_FRONT_OUTLINE,
    backOutline:  sex === 'female' ? FEMALE_BACK_OUTLINE  : MALE_BACK_OUTLINE,
    frontMuscles: sex === 'female' ? FEMALE_FRONT_MUSCLE_PATHS : MALE_FRONT_MUSCLE_PATHS,
    backMuscles:  sex === 'female' ? FEMALE_BACK_MUSCLE_PATHS  : MALE_BACK_MUSCLE_PATHS,
  };
}

// ─── Muscle Detail Lines ─────────────────────────────────────────────────────
// Open paths rendered at low opacity to add anatomical definition / muscle
// separation lines on top of the outline silhouette.

export type DetailLine = {
  /** SVG path data — open path, no Z */
  d: string;
  sex: 'male' | 'female' | 'both';
  view: 'front' | 'back' | 'both';
};

export const MUSCLE_DETAIL_LINES: DetailLine[] = [
  // ── MALE FRONT ──────────────────────────────────────────────────────────────

  // Sternum / pec split — vertical center line down chest
  { sex: 'male', view: 'front', d: 'M 150 120 C 150 140 150 160 150 188' },

  // Left pec lower border
  { sex: 'male', view: 'front', d: 'M 114 142 C 118 168 124 180 132 186' },

  // Right pec lower border
  { sex: 'male', view: 'front', d: 'M 186 142 C 182 168 176 180 168 186' },

  // Ab linea alba (center vertical through abs)
  { sex: 'male', view: 'front', d: 'M 150 188 L 150 244' },

  // Ab horizontal line 1 (upper)
  { sex: 'male', view: 'front', d: 'M 126 200 C 136 198 150 198 174 200' },

  // Ab horizontal line 2 (mid)
  { sex: 'male', view: 'front', d: 'M 124 214 C 135 212 150 212 176 214' },

  // Ab horizontal line 3 (lower)
  { sex: 'male', view: 'front', d: 'M 124 228 C 135 226 150 226 176 228' },

  // Serratus anterior fingers — left side (3 short diagonals)
  { sex: 'male', view: 'front', d: 'M 108 168 C 114 172 118 174 122 172' },
  { sex: 'male', view: 'front', d: 'M 107 180 C 113 184 117 186 121 184' },
  { sex: 'male', view: 'front', d: 'M 107 192 C 113 196 117 198 121 196' },

  // Serratus anterior fingers — right side (3 short diagonals)
  { sex: 'male', view: 'front', d: 'M 192 168 C 186 172 182 174 178 172' },
  { sex: 'male', view: 'front', d: 'M 193 180 C 187 184 183 186 179 184' },
  { sex: 'male', view: 'front', d: 'M 193 192 C 187 196 183 198 179 196' },

  // Oblique V-cut left
  { sex: 'male', view: 'front', d: 'M 126 234 C 120 242 116 252 114 260' },

  // Oblique V-cut right
  { sex: 'male', view: 'front', d: 'M 174 234 C 180 242 184 252 186 260' },

  // Left bicep peak separation line
  { sex: 'male', view: 'front', d: 'M 74 172 C 76 188 76 204 74 220' },

  // Right bicep peak separation line
  { sex: 'male', view: 'front', d: 'M 226 172 C 224 188 224 204 226 220' },

  // Left forearm line
  { sex: 'male', view: 'front', d: 'M 68 248 C 70 258 72 268 74 278' },

  // Right forearm line
  { sex: 'male', view: 'front', d: 'M 232 248 C 230 258 228 268 226 278' },

  // Left quad teardrop inner line (VMO / inner quad)
  { sex: 'male', view: 'front', d: 'M 130 292 C 132 320 134 360 134 400 C 133 428 130 448 126 456' },

  // Right quad teardrop inner line (VMO / inner quad)
  { sex: 'male', view: 'front', d: 'M 170 292 C 168 320 166 360 166 400 C 167 428 170 448 174 456' },

  // Left quad rectus/vastus outer split
  { sex: 'male', view: 'front', d: 'M 104 300 C 100 330 98 370 98 410 C 99 432 102 448 107 456' },

  // Right quad rectus/vastus outer split
  { sex: 'male', view: 'front', d: 'M 196 300 C 200 330 202 370 202 410 C 201 432 198 448 193 456' },

  // ── MALE BACK ───────────────────────────────────────────────────────────────

  // Trap diamond — left diagonal from neck to mid-back
  { sex: 'male', view: 'back', d: 'M 150 100 C 144 112 134 128 124 144 C 118 154 114 164 114 174' },

  // Trap diamond — right diagonal from neck to mid-back
  { sex: 'male', view: 'back', d: 'M 150 100 C 156 112 166 128 176 144 C 182 154 186 164 186 174' },

  // Spine / erector spinae center line
  { sex: 'male', view: 'back', d: 'M 150 108 L 150 270' },

  // Left lat border — curved from armpit down to hip
  { sex: 'male', view: 'back', d: 'M 100 148 C 96 168 94 194 96 218 C 98 238 104 256 110 268' },

  // Right lat border — curved from armpit down to hip
  { sex: 'male', view: 'back', d: 'M 200 148 C 204 168 206 194 204 218 C 202 238 196 256 190 268' },

  // Left tricep horseshoe
  { sex: 'male', view: 'back', d: 'M 68 168 C 65 182 64 200 66 216 C 68 228 72 238 78 244' },

  // Right tricep horseshoe
  { sex: 'male', view: 'back', d: 'M 232 168 C 235 182 236 200 234 216 C 232 228 228 238 222 244' },

  // Left glute fold
  { sex: 'male', view: 'back', d: 'M 106 330 C 114 342 126 348 140 346' },

  // Right glute fold
  { sex: 'male', view: 'back', d: 'M 194 330 C 186 342 174 348 160 346' },

  // Left hamstring midline
  { sex: 'male', view: 'back', d: 'M 122 344 C 122 374 122 410 122 444 C 122 458 124 468 126 478' },

  // Right hamstring midline
  { sex: 'male', view: 'back', d: 'M 178 344 C 178 374 178 410 178 444 C 178 458 176 468 174 478' },

  // Left rhomboid line
  { sex: 'male', view: 'back', d: 'M 152 128 C 158 132 166 136 174 138' },

  // Right rhomboid line
  { sex: 'male', view: 'back', d: 'M 148 128 C 142 132 134 136 126 138' },

  // Second rhomboid (lower)
  { sex: 'male', view: 'back', d: 'M 152 146 C 158 150 168 153 176 154' },
  { sex: 'male', view: 'back', d: 'M 148 146 C 142 150 132 153 124 154' },

  // ── FEMALE FRONT ────────────────────────────────────────────────────────────

  // Sternum center line (softer, shorter than male)
  { sex: 'female', view: 'front', d: 'M 150 122 C 150 140 150 158 150 180' },

  // Left pec lower border (softer curve)
  { sex: 'female', view: 'front', d: 'M 118 140 C 122 162 128 176 136 184' },

  // Right pec lower border (softer curve)
  { sex: 'female', view: 'front', d: 'M 182 140 C 178 162 172 176 164 184' },

  // Ab linea alba
  { sex: 'female', view: 'front', d: 'M 150 186 L 150 246' },

  // Ab horizontal line 1 (upper)
  { sex: 'female', view: 'front', d: 'M 130 202 C 139 200 150 200 170 202' },

  // Ab horizontal line 2 (lower)
  { sex: 'female', view: 'front', d: 'M 130 220 C 139 218 150 218 170 220' },

  // Oblique line left (shorter than male)
  { sex: 'female', view: 'front', d: 'M 128 230 C 122 238 118 248 116 256' },

  // Oblique line right
  { sex: 'female', view: 'front', d: 'M 172 230 C 178 238 182 248 184 256' },

  // Left bicep toned line
  { sex: 'female', view: 'front', d: 'M 84 166 C 84 182 84 200 84 216' },

  // Right bicep toned line
  { sex: 'female', view: 'front', d: 'M 216 166 C 216 182 216 200 216 216' },

  // Left quad inner line (VMO)
  { sex: 'female', view: 'front', d: 'M 140 283 C 141 310 142 348 142 386 C 141 410 139 430 136 444' },

  // Right quad inner line (VMO)
  { sex: 'female', view: 'front', d: 'M 160 283 C 159 310 158 348 158 386 C 159 410 161 430 164 444' },

  // Left quad outer line
  { sex: 'female', view: 'front', d: 'M 117 284 C 114 308 112 346 112 384 C 113 408 116 428 120 440' },

  // Right quad outer line
  { sex: 'female', view: 'front', d: 'M 183 284 C 186 308 188 346 188 384 C 187 408 184 428 180 440' },

  // ── FEMALE BACK ─────────────────────────────────────────────────────────────

  // Trap diamond left (lighter)
  { sex: 'female', view: 'back', d: 'M 150 102 C 145 114 136 128 127 142 C 122 152 120 162 120 170' },

  // Trap diamond right (lighter)
  { sex: 'female', view: 'back', d: 'M 150 102 C 155 114 164 128 173 142 C 178 152 180 162 180 170' },

  // Spine / erector center line
  { sex: 'female', view: 'back', d: 'M 150 108 L 150 260' },

  // Left lat border
  { sex: 'female', view: 'back', d: 'M 104 142 C 100 162 98 188 100 210 C 102 228 108 246 114 256' },

  // Right lat border
  { sex: 'female', view: 'back', d: 'M 196 142 C 200 162 202 188 200 210 C 198 228 192 246 186 256' },

  // Left tricep line (toned)
  { sex: 'female', view: 'back', d: 'M 78 162 C 75 176 74 194 76 210 C 78 222 82 232 87 238' },

  // Right tricep line (toned)
  { sex: 'female', view: 'back', d: 'M 222 162 C 225 176 226 194 224 210 C 222 222 218 232 213 238' },

  // Left glute fold
  { sex: 'female', view: 'back', d: 'M 113 326 C 122 338 134 344 148 342' },

  // Right glute fold
  { sex: 'female', view: 'back', d: 'M 187 326 C 178 338 166 344 152 342' },

  // Left hamstring midline
  { sex: 'female', view: 'back', d: 'M 127 338 C 127 366 127 400 127 432 C 127 446 128 456 130 464' },

  // Right hamstring midline
  { sex: 'female', view: 'back', d: 'M 173 338 C 173 366 173 400 173 432 C 173 446 172 456 170 464' },
];

// ─── Muscle Region → MuscleGroup Mapping ────────────────────────────────────

export const REGION_TO_MUSCLE: Record<string, string> = {
  // Front
  chest: 'Chest',
  leftShoulder: 'Shoulders',
  rightShoulder: 'Shoulders',
  leftBicep: 'Biceps',
  rightBicep: 'Biceps',
  core: 'Core',
  leftQuad: 'Quads',
  rightQuad: 'Quads',
  leftCalfFront: 'Calves',
  rightCalfFront: 'Calves',
  // Back
  upperBack: 'Back',
  lowerBack: 'Back',
  leftRearDelt: 'Shoulders',
  rightRearDelt: 'Shoulders',
  leftTricep: 'Triceps',
  rightTricep: 'Triceps',
  leftGlute: 'Glutes',
  rightGlute: 'Glutes',
  leftHamstring: 'Hamstrings',
  rightHamstring: 'Hamstrings',
  leftCalfBack: 'Calves',
  rightCalfBack: 'Calves',
};

// ─── Organ Paths (Cardio Layer) ─────────────────────────────────────────────
// Anatomical heart — simplified but recognizable with aorta arch.
// Positioned in upper-left chest area.

export const ORGAN_PATHS = {
  heart: {
    // Main heart body — anatomical shape with ventricles
    main: `
      M 148 205
      C 145 200 138 195 133 195
      C 126 195 122 203 122 210
      C 122 220 130 232 148 242
      C 166 232 174 220 174 210
      C 174 203 170 195 163 195
      C 158 195 151 200 148 205 Z
    `,
    // Aorta arch — curves up and to the right from top of heart
    aorta: `
      M 142 198
      C 140 190 138 182 140 176
      C 142 170 148 168 154 170
      C 160 172 162 178 160 184
      L 158 195
    `,
    position: { x: 148, y: 218 },
    size: { width: 52, height: 47 },
  },

  leftLung: {
    // Left lung — 2 lobes, semi-transparent
    main: `
      M 108 170
      C 100 175 94 188 92 205
      C 90 225 92 245 98 255
      C 102 262 110 258 115 250
      L 118 225
      L 120 195
      C 120 182 115 172 108 170 Z
    `,
    position: { x: 106, y: 212 },
  },

  rightLung: {
    // Right lung — 3 lobes, semi-transparent
    main: `
      M 192 170
      C 200 175 206 188 208 205
      C 210 225 208 245 202 255
      C 198 262 190 258 185 250
      L 182 225
      L 180 195
      C 180 182 185 172 192 170 Z
    `,
    position: { x: 194, y: 212 },
  },
};

// ─── Cardio Leg Region IDs ──────────────────────────────────────────────────
// Maps to the muscle paths that represent leg regions for cardio coloring

export const CARDIO_FRONT_LEG_REGIONS = [
  'leftQuad', 'rightQuad', 'leftCalfFront', 'rightCalfFront',
] as const;

export const CARDIO_BACK_LEG_REGIONS = [
  'leftHamstring', 'rightHamstring', 'leftCalfBack', 'rightCalfBack',
  'leftGlute', 'rightGlute',
] as const;

// ─── Measurement Point Positions ────────────────────────────────────────────
// Coordinates in the 300x600 viewBox for placing measurement circles/labels

export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  { field: 'neck',       label: 'Neck',       x: 150, y: 95 },
  { field: 'shoulders',  label: 'Shoulders',  x: 150, y: 118 },
  { field: 'chest',      label: 'Chest',      x: 150, y: 155 },
  { field: 'leftBicep',  label: 'L Bicep',    x: 82,  y: 185 },
  { field: 'rightBicep', label: 'R Bicep',    x: 218, y: 185 },
  { field: 'waist',      label: 'Waist',      x: 150, y: 230 },
  { field: 'hips',       label: 'Hips',       x: 150, y: 268 },
  { field: 'leftThigh',  label: 'L Thigh',    x: 115, y: 365 },
  { field: 'rightThigh', label: 'R Thigh',    x: 185, y: 365 },
  { field: 'leftCalf',   label: 'L Calf',     x: 118, y: 495 },
  { field: 'rightCalf',  label: 'R Calf',     x: 182, y: 495 },
];

// ─── Injection Zone Geometry (scaled for 300x600) ───────────────────────────
// Scaled ~1.5x from existing BodyMapSVG (200x380 → 300x600)

export const INJECTION_FRONT_ZONES: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  frontLeftDelt:   { cx: 93,  cy: 128, rx: 24, ry: 21 },
  frontRightDelt:  { cx: 207, cy: 128, rx: 24, ry: 21 },
  frontLeftAbs:    { cx: 130, cy: 225, rx: 22, ry: 28 },
  frontRightAbs:   { cx: 170, cy: 225, rx: 22, ry: 28 },
  frontLeftThigh:  { cx: 118, cy: 365, rx: 22, ry: 30 },
  frontRightThigh: { cx: 182, cy: 365, rx: 22, ry: 30 },
};

export const INJECTION_BACK_ZONES: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  backLeftGlute:   { cx: 125, cy: 290, rx: 30, ry: 30 },
  backRightGlute:  { cx: 175, cy: 290, rx: 30, ry: 30 },
  backLeftThigh:   { cx: 118, cy: 380, rx: 22, ry: 30 },
  backRightThigh:  { cx: 182, cy: 380, rx: 22, ry: 30 },
};
