// ============================================================
// تغذية راجعة حسية: صوت نقرة خفيف + اهتزاز لمسي
// الصوت مولد بـWebAudio (بلا ملفات) — الأذن السريعة والخفيفة
// ============================================================

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => undefined);
    return audioCtx;
  } catch {
    return null;
  }
}

// نقرة خفيفة قصيرة (نغمات تتناسب مع الثيم الذهبي)
export function playClick(): void {
  try {
    const c = ctx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.05);
    gain.gain.setValueAtTime(0.045, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.07);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.08);
  } catch {
    /* تجاهل */
  }
}

// اهتزاز لمسي خفيف (هاتف)
export function haptic(ms = 10): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* تجاهل */
  }
}
