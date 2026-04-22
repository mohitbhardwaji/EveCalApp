export function recordingFailureMessage(nativeDetail: string): string {
  const base =
    'Something went wrong starting the microphone. Try again in a moment.';
  const hints: string[] = [];
  if (
    nativeDetail.includes('3 attempts') ||
    nativeDetail.toLowerCase().includes('microphone')
  ) {
    hints.push(
      '• iOS Simulator often cannot record audio — use a physical iPhone to test recording.',
    );
    hints.push(
      '• On a real device: Settings → Eve Cal → Microphone → allow, then reopen the app.',
    );
  }
  if (nativeDetail.includes('permission denied')) {
    hints.length = 0;
    hints.push(
      'Microphone access was denied. Enable it in Settings → Eve Cal → Microphone.',
    );
  }
  if (hints.length === 0) {
    return `${base}\n\n${nativeDetail}`;
  }
  return `${base}\n\n${hints.join('\n')}`;
}
