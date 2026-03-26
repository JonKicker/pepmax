/** Message types exchanged between the phone app and Apple Watch */
export type WatchMessageType =
  | 'SYNC_STATE'              // Current app state snapshot (macros, next dose, etc.)
  | 'WORKOUT_UPDATE'          // Live workout progress / active workout plan push
  | 'NUTRITION_SUMMARY'       // Today's nutrition totals
  | 'HEART_RATE'              // Heart rate data from an active cardio session
  | 'GYM_SET_LOGGED'          // Watch → phone: a set was logged on the watch
  | 'GYM_WORKOUT_COMPLETE'    // Watch → phone: workout finished on the watch
  | 'CARDIO_SESSION_COMPLETE' // Watch → phone: independent watch cardio session finished
  | 'PEPTIDE_DOSE_LOGGED'     // Watch → phone: dose logged on the watch
  | 'WATER_LOGGED'            // Watch → phone: water intake logged on the watch

export type WatchMessage = {
  type: WatchMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
};

export type WatchState = {
  isPaired: boolean;
  isReachable: boolean;
};
