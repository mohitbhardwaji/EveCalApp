import type { AudioSet } from 'react-native-audio-recorder-player';
import {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVModeIOSOption,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';

/**
 * Tuned for voice capture: mono + iOS session suited to recording (fewer
 * `record()` failures than default 2‑channel / default mode on some devices).
 *
 * Uses v3 `AudioSet` field names (`AudioSamplingRateAndroid` / `AudioChannelsAndroid`).
 */
export const VOICE_CAPTURE_AUDIO_SET: AudioSet = {
  AVModeIOS: AVModeIOSOption.videorecording,
  AVNumberOfChannelsKeyIOS: 1,
  AudioChannelsAndroid: 1,
  AVSampleRateKeyIOS: 44100,
  AudioSamplingRateAndroid: 44100,
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
};
