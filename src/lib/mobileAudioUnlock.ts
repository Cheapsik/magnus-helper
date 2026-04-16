/** Jednorazowe odblokowanie audio na iOS / Android (wywołaj synchronicznie z handlera gestu). */
let didUnlock = false;

export function unlockMobileAudio(): void {
  if (didUnlock || typeof window === "undefined") return;
  didUnlock = true;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    void ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    try {
      src.start(0);
      src.stop(0.001);
    } catch {
      /* ignore */
    }
    void ctx.close();
  } catch {
    /* ignore */
  }
}
