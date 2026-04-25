export function pointsForAnswer({
  timerSeconds,
  timeToAnswerSeconds,
}: {
  timerSeconds: number;
  timeToAnswerSeconds: number;
}) {
  const t = Math.max(0, Math.min(timerSeconds, timeToAnswerSeconds));
  const timeRemaining = Math.max(0, timerSeconds - t);
  return 1000 + Math.round((timeRemaining / timerSeconds) * 500);
}

export function pointsIfAnsweredNow({
  timerSeconds,
  startedAtMs,
  nowMs = Date.now(),
}: {
  timerSeconds: number;
  startedAtMs: number;
  nowMs?: number;
}) {
  const elapsed = (nowMs - startedAtMs) / 1000;
  return pointsForAnswer({ timerSeconds, timeToAnswerSeconds: elapsed });
}

