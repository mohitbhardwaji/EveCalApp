/**
 * Lazy-loads `react-native-audio-recorder-player` (classic bridge) on first use.
 * A static import would load native bindings as soon as Capture loads; we defer
 * until the user actually records so a broken native install fails gracefully.
 */
import type AudioRecorderPlayerClass from 'react-native-audio-recorder-player';

export type AudioRecorderInstance = InstanceType<typeof AudioRecorderPlayerClass>;

let cached: AudioRecorderInstance | null | undefined;

export function tryLoadAudioRecorder(): AudioRecorderInstance | null {
  if (cached !== undefined) {
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-audio-recorder-player') as {
      default: typeof AudioRecorderPlayerClass;
    };
    cached = new mod.default();
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

/** mm:ss fallback if the native module never loaded */
export function formatDurationMmSs(seconds: number): string {
  const r = tryLoadAudioRecorder();
  if (r) {
    return r.mmss(Math.max(0, Math.floor(seconds)));
  }
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const NATIVE_AUDIO_SETUP_HINT =
  'Install native dependencies and rebuild: from the project root run `cd ios && pod install`, then clean build in Xcode (Product → Clean Build Folder) and run again. On Android, run `./gradlew clean` then rebuild.';
