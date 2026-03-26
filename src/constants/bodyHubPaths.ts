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
  M 150 28
  C 128 28 115 42 115 57
  C 115 74 131 87 150 87
  C 169 87 185 74 185 57
  C 185 42 172 28 150 28 Z

  M 150 87
  C 146 90 142 94 141 98
  C 128 100 116 106 104 114
  C 99 118 88 121 79 124
  C 67 127 57 133 52 143
  C 50 148 50 152 50 155
  L 49 180
  C 49 188 51 196 55 201
  C 52 210 50 218 50 224
  C 49 232 52 240 58 245
  C 60 246 61 247 62 248
  L 74 248
  C 76 258 79 268 82 274
  C 85 280 92 284 100 284
  L 104 280
  L 104 248
  L 196 248
  L 196 280
  L 200 284
  C 208 284 215 280 218 274
  C 221 268 224 258 226 248
  L 238 248
  C 239 247 240 246 242 245
  C 248 240 251 232 251 224
  C 251 218 249 210 246 201
  C 250 196 251 188 251 180
  L 250 155
  C 250 152 250 148 248 143
  C 243 133 233 127 221 124
  C 212 121 201 118 196 114
  C 184 106 172 100 159 98
  C 158 94 154 90 150 87 Z

  M 108 284
  C 102 288 99 295 98 302
  C 95 320 94 350 93 380
  C 92 406 92 428 93 440
  C 92 452 97 462 107 465
  L 124 469
  C 125 478 126 488 127 498
  C 129 514 130 524 132 533
  C 133 543 137 551 145 553
  L 156 553
  C 159 549 162 541 164 533
  C 166 524 167 514 169 498
  C 170 488 171 478 172 469
  L 189 465
  C 199 462 204 452 203 440
  C 204 428 204 406 203 380
  C 202 350 201 320 198 302
  C 197 295 194 288 188 284
  L 108 284 Z
`;

export const MALE_BACK_OUTLINE = `
  M 150 28
  C 128 28 115 42 115 57
  C 115 74 131 87 150 87
  C 169 87 185 74 185 57
  C 185 42 172 28 150 28 Z

  M 150 87
  C 146 90 142 94 141 98
  C 128 100 116 106 104 114
  C 99 118 86 121 76 125
  C 64 129 54 136 50 147
  C 49 151 49 153 49 155
  L 48 180
  C 48 188 51 197 55 202
  C 52 211 50 219 50 224
  C 49 234 53 244 62 248
  L 74 248
  C 76 258 79 268 82 274
  C 85 280 92 284 100 284
  L 104 280
  L 104 248
  L 196 248
  L 196 280
  L 200 284
  C 208 284 215 280 218 274
  C 221 268 224 258 226 248
  L 238 248
  C 247 244 251 234 250 224
  C 250 219 248 211 245 202
  C 249 197 252 188 252 180
  L 251 155
  C 251 153 251 151 250 147
  C 246 136 236 129 224 125
  C 214 121 201 118 196 114
  C 184 106 172 100 159 98
  C 158 94 154 90 150 87 Z

  M 108 284
  C 102 288 99 295 98 302
  C 95 320 94 350 93 380
  C 92 406 92 428 93 440
  C 92 452 97 462 107 465
  L 122 469
  C 124 478 125 488 127 498
  C 128 512 130 524 132 533
  C 133 543 137 551 145 553
  L 156 553
  C 159 549 162 541 164 533
  C 166 524 168 512 169 498
  C 171 488 172 478 174 469
  L 189 465
  C 199 462 204 452 203 440
  C 204 428 204 406 203 380
  C 202 350 201 320 198 302
  C 197 295 194 288 188 284
  L 108 284 Z
`;

// ─── Male Front Muscle Paths ─────────────────────────────────────────────────

export const MALE_FRONT_MUSCLE_PATHS: Record<string, string> = {
  // Chest — two pec masses with sternum gap detail
  chest: `
    M 114 140
    C 120 128 134 120 149 120
    C 148 124 148 130 148 136
    C 148 152 148 170 147 178
    C 143 184 138 187 132 186
    C 124 185 118 180 115 172
    C 112 164 112 150 114 140 Z

    M 186 140
    C 180 128 166 120 151 120
    C 152 124 152 130 152 136
    C 152 152 152 170 153 178
    C 157 184 162 187 168 186
    C 176 185 182 180 185 172
    C 188 164 188 150 186 140 Z
  `,
  // Left Shoulder (deltoid) — prominent cap, wide insertion
  leftShoulder: `
    M 72 124
    C 77 112 95 104 111 112
    C 113 126 114 143 112 155
    C 103 160 92 157 83 148
    C 77 140 71 132 72 124 Z
  `,
  // Right Shoulder (deltoid) — prominent cap, wide insertion
  rightShoulder: `
    M 228 124
    C 223 112 205 104 189 112
    C 187 126 186 143 188 155
    C 197 160 208 157 217 148
    C 223 140 229 132 228 124 Z
  `,
  // Left Bicep — fuller peak, tapered at elbow
  leftBicep: `
    M 70 158
    C 64 166 59 184 57 206
    C 57 224 60 238 68 244
    C 75 249 84 246 90 238
    C 95 230 96 210 95 168
    C 90 156 79 152 70 158 Z
  `,
  // Right Bicep — fuller peak, tapered at elbow
  rightBicep: `
    M 230 158
    C 236 166 241 184 243 206
    C 243 224 240 238 232 244
    C 225 249 216 246 210 238
    C 205 230 204 210 205 168
    C 210 156 221 152 230 158 Z
  `,
  // Core / Abs — 6-pack grid suggestion with tapered flanks
  core: `
    M 124 188
    C 132 186 141 185 150 185
    C 159 185 168 186 176 188
    C 177 200 178 214 177 228
    C 175 236 170 240 163 240
    L 155 243
    L 150 244
    L 145 243
    L 137 240
    C 130 240 125 236 123 228
    C 122 214 123 200 124 188 Z
  `,
  // Left Quad — teardrop sweep with inner sweep detail
  leftQuad: `
    M 104 289
    C 101 298 98 312 97 336
    C 95 374 95 414 97 438
    C 100 449 108 456 117 453
    C 128 450 136 443 138 430
    C 141 408 141 368 140 334
    C 139 311 136 296 132 289
    L 104 289 Z
  `,
  // Right Quad — teardrop sweep with inner sweep detail
  rightQuad: `
    M 196 289
    C 199 298 202 312 203 336
    C 205 374 205 414 203 438
    C 200 449 192 456 183 453
    C 172 450 164 443 162 430
    C 159 408 159 368 160 334
    C 161 311 164 296 168 289
    L 196 289 Z
  `,
  // Left Calf (front) — prominent gastroc belly
  leftCalfFront: `
    M 106 470
    C 103 484 101 505 103 524
    C 105 538 111 549 118 552
    C 125 554 132 551 136 544
    C 139 534 139 510 137 482
    C 136 473 133 467 130 466
    L 106 470 Z
  `,
  // Right Calf (front) — prominent gastroc belly
  rightCalfFront: `
    M 194 470
    C 197 484 199 505 197 524
    C 195 538 189 549 182 552
    C 175 554 168 551 164 544
    C 161 534 161 510 163 482
    C 164 473 167 467 170 466
    L 194 470 Z
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
  M 150 28
  C 130 28 118 41 118 56
  C 118 72 132 85 150 85
  C 168 85 182 72 182 56
  C 182 41 170 28 150 28 Z

  M 150 85
  C 147 88 144 92 143 97
  C 133 99 124 103 115 110
  C 110 114 100 118 92 121
  C 82 124 74 132 72 142
  C 71 145 71 146 71 147
  L 70 178
  C 70 186 72 194 75 199
  C 73 207 72 215 72 218
  C 71 226 74 234 80 239
  C 81 239 81 240 82 240
  L 91 240
  C 93 250 95 260 97 266
  C 100 272 106 276 113 276
  L 116 272
  L 116 240
  L 184 240
  L 184 272
  L 187 276
  C 194 276 200 272 203 266
  C 205 260 207 250 209 240
  L 218 240
  C 219 240 219 239 220 239
  C 226 234 229 226 228 218
  C 228 215 227 207 225 199
  C 228 194 230 186 230 178
  L 229 147
  C 229 146 229 145 228 142
  C 226 132 218 124 208 121
  C 200 118 190 114 185 110
  C 176 103 167 99 157 97
  C 156 92 153 88 150 85 Z

  M 120 276
  C 113 280 110 288 109 296
  C 107 316 106 348 105 378
  C 104 406 104 422 105 432
  C 104 444 108 454 118 456
  L 134 460
  C 135 470 137 482 138 494
  C 139 506 140 514 141 522
  C 143 532 146 540 152 542
  L 160 542
  C 163 538 166 530 168 522
  C 169 514 170 506 171 494
  C 172 482 174 470 175 460
  L 191 456
  C 201 454 205 444 204 432
  C 205 422 204 406 204 378
  C 203 348 202 316 200 296
  C 199 288 196 280 189 276
  L 120 276 Z
`;

export const FEMALE_BACK_OUTLINE = `
  M 150 28
  C 130 28 118 41 118 56
  C 118 72 132 85 150 85
  C 168 85 182 72 182 56
  C 182 41 170 28 150 28 Z

  M 150 85
  C 147 88 144 92 143 97
  C 133 99 124 103 115 110
  C 110 114 100 118 92 121
  C 82 124 74 132 72 142
  C 71 145 71 146 71 147
  L 70 178
  C 70 186 72 194 75 199
  C 73 207 72 215 72 218
  C 71 226 74 234 80 239
  C 81 239 81 240 82 240
  L 91 240
  C 93 250 95 260 97 266
  C 100 272 106 276 113 276
  L 116 272
  L 116 240
  L 184 240
  L 184 272
  L 187 276
  C 194 276 200 272 203 266
  C 205 260 207 250 209 240
  L 218 240
  C 219 240 219 239 220 239
  C 226 234 229 226 228 218
  C 228 215 227 207 225 199
  C 228 194 230 186 230 178
  L 229 147
  C 229 146 229 145 228 142
  C 226 132 218 124 208 121
  C 200 118 190 114 185 110
  C 176 103 167 99 157 97
  C 156 92 153 88 150 85 Z

  M 120 276
  C 113 280 110 288 109 296
  C 107 316 106 348 105 378
  C 104 406 104 422 105 432
  C 104 444 108 454 118 456
  L 134 460
  C 135 470 137 482 138 494
  C 139 506 140 514 141 522
  C 143 532 146 540 152 542
  L 160 542
  C 163 538 166 530 168 522
  C 169 514 170 506 171 494
  C 172 482 174 470 175 460
  L 191 456
  C 201 454 205 444 204 432
  C 205 422 204 406 204 378
  C 203 348 202 316 200 296
  C 199 288 196 280 189 276
  L 120 276 Z
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
