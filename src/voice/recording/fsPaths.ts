import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

const LISTEN_SCRATCH_BASENAME = 'evecal_listen.m4a';

export function listenRecorderPath(): string {
  return Platform.OS === 'android'
    ? `${RNFS.CachesDirectoryPath}/${LISTEN_SCRATCH_BASENAME}`
    : LISTEN_SCRATCH_BASENAME;
}

export function listenScratchFsPath(): string {
  return `${RNFS.CachesDirectoryPath}/${LISTEN_SCRATCH_BASENAME}`;
}

/** One file per pause-delimited segment — never reuse default recorder path across utterances. */
export function segmentRecordingPath(segmentId: string): string {
  return `${RNFS.CachesDirectoryPath}/evecal_seg_${segmentId}.m4a`;
}

export async function unlinkSegmentRecording(segmentId: string): Promise<void> {
  try {
    await RNFS.unlink(segmentRecordingPath(segmentId));
  } catch {
    /* */
  }
}

export function recorderPathToFsPath(uri: string): string {
  const u = uri.trim();
  if (u.startsWith('content://')) {
    return u;
  }
  return u.replace(/^file:(\/)+/, '/');
}

export async function unlinkListenScratch(): Promise<void> {
  try {
    await RNFS.unlink(listenScratchFsPath());
  } catch {
    /* */
  }
}

export async function snapshotToSegmentFile(
  segmentId: string,
  rawPath: string,
): Promise<string | null> {
  if (
    !rawPath ||
    rawPath === 'Already stopped' ||
    rawPath.toLowerCase().includes('already')
  ) {
    return null;
  }
  const src = recorderPathToFsPath(rawPath);
  const dest = `${RNFS.CachesDirectoryPath}/evecal_cap_${segmentId}.m4a`;
  try {
    await RNFS.copyFile(src, dest);
    return dest;
  } catch {
    return null;
  }
}
