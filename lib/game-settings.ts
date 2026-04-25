export type GameSettingsV1 = {
  settingsVersion: 1;
  questionCount: number;
  timerSeconds: number;
  showWinnersTicker: boolean;
};

export type GameSettings = GameSettingsV1;

export type CreateGameRequest = {
  settings?: Partial<GameSettingsV1> & { settingsVersion?: 1 };
  // Back-compat / convenience
  numQuestions?: number;
  timerDuration?: number;
  packIds?: string[];
};

export type ValidatedCreateGame = {
  settings: GameSettingsV1;
  packIds: string[] | undefined;
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function validateCreateGame(body: unknown): ValidatedCreateGame {
  const obj = (isRecord(body) ? (body as unknown as CreateGameRequest) : {}) as CreateGameRequest;

  const v = obj.settings?.settingsVersion ?? 1;
  if (v !== 1) {
    throw new Error('Unsupported settingsVersion');
  }

  const questionCountRaw: unknown =
    obj.settings?.questionCount ??
    obj.numQuestions ??
    15;

  const timerSecondsRaw: unknown =
    obj.settings?.timerSeconds ??
    obj.timerDuration ??
    15;

  const showWinnersTickerRaw: unknown =
    obj.settings?.showWinnersTicker ??
    false;

  const questionCountNum = getNumber(questionCountRaw) ?? 15;
  const timerSecondsNum = getNumber(timerSecondsRaw) ?? 15;

  const settings: GameSettingsV1 = {
    settingsVersion: 1,
    questionCount: clampInt(questionCountNum, 1, 30),
    timerSeconds: clampInt(timerSecondsNum, 5, 60),
    showWinnersTicker: Boolean(showWinnersTickerRaw),
  };

  const packIds =
    Array.isArray(obj.packIds) ? obj.packIds.filter((p) => typeof p === 'string' && p.length > 0) : undefined;

  return { settings, packIds };
}

