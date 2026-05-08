// Contas Em Pé — Lógica pura (sem DOM, sem React)
// Funções: geração de exercícios, validação, persistência em localStorage.

(function (global) {
  'use strict';

  const APP_VERSION = '1.1.0';
  const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1h

  const LEVELS = [
    { n: 1,  digits: 2, parcelas: 2, mode: 'col' },
    { n: 2,  digits: 2, parcelas: 2, mode: 'fim' },
    { n: 3,  digits: 3, parcelas: 2, mode: 'col' },
    { n: 4,  digits: 3, parcelas: 2, mode: 'fim' },
    { n: 5,  digits: 3, parcelas: 3, mode: 'col' },
    { n: 6,  digits: 3, parcelas: 3, mode: 'fim' },
    { n: 7,  digits: 4, parcelas: 2, mode: 'col' },
    { n: 8,  digits: 4, parcelas: 2, mode: 'fim' },
    { n: 9,  digits: 4, parcelas: 3, mode: 'col' },
    { n: 10, digits: 4, parcelas: 3, mode: 'fim' },
    { n: 11, digits: 4, parcelas: 4, mode: 'col' },
    { n: 12, digits: 4, parcelas: 4, mode: 'fim' },
  ];

  const STORAGE_KEY = 'contas_em_pe';
  const SCHEMA_VERSION = 3;
  const MAX_PROFILES = 10;
  const AVATAR_OPTIONS = ['🦊', '🐰', '🦄', '🐢', '🦔', '🦝', '🐉', '🦋'];
  const DEFAULT_AVATAR = '🦊';
  const POINTS_TO_LEVELUP = 50;
  const HITS_TO_LEVEL_UP_TIMEATTACK = 5;
  const TIME_ATTACK_DURATION_S = 600;
  const LEADERBOARD_MAX_ENTRIES = 10;

  // Pontuação: nunca desconta, só soma. À 1ª = 10 pontos. Após erros = 5 pontos.
  const POINTS_FIRST_TRY = 10;
  const POINTS_RETRY = 5;

  function computePointsForExercise(firstTry) {
    return firstTry ? POINTS_FIRST_TRY : POINTS_RETRY;
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function emptyOperationProgress() {
    return {
      level: 1,
      maxLevelReached: 1,
      points: 0,
      streak: 0,
      pointsSinceLastLevelUp: 0,
      totalAttempts: 0,
      totalCorrectFirstTry: 0,
      lastPlayed: todayISO(),
    };
  }

  function defaultState() {
    return {
      version: SCHEMA_VERSION,
      lastProfile: null,
      appConfig: { mascotName: null },
      profiles: {},
      leaderboards: {},
    };
  }

  function clampLevel(raw) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
    return Math.min(12, Math.max(1, Math.floor(raw)));
  }

  // Migra um estado v1 para o shape v2 (adiciona `points` calculado retroactivamente
  // a partir de `totalCorrectFirstTry * POINTS_FIRST_TRY` para o jogador não perder
  // o reconhecimento do progresso já feito).
  function migrateV1toV2(parsed) {
    const totalCorrect = typeof parsed.totalCorrectFirstTry === 'number' ? parsed.totalCorrectFirstTry : 0;
    return {
      level: clampLevel(parsed.level),
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      points: totalCorrect * POINTS_FIRST_TRY,
      totalAttempts: typeof parsed.totalAttempts === 'number' ? parsed.totalAttempts : 0,
      totalCorrectFirstTry: totalCorrect,
      lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : todayISO(),
      version: 2,
    };
  }

  function migrateV2toV3(v2) {
    const level = clampLevel(v2.level);
    const lastPlayed = typeof v2.lastPlayed === 'string' ? v2.lastPlayed : todayISO();
    return {
      version: SCHEMA_VERSION,
      lastProfile: 'jogador',
      appConfig: { mascotName: null },
      profiles: {
        'jogador': {
          name: 'jogador',
          avatar: DEFAULT_AVATAR,
          createdAt: lastPlayed,
          somas: {
            level,
            maxLevelReached: level,
            points: typeof v2.points === 'number' && v2.points >= 0 ? v2.points : 0,
            streak: typeof v2.streak === 'number' ? v2.streak : 0,
            pointsSinceLastLevelUp: 0,
            totalAttempts: typeof v2.totalAttempts === 'number' ? v2.totalAttempts : 0,
            totalCorrectFirstTry: typeof v2.totalCorrectFirstTry === 'number' ? v2.totalCorrectFirstTry : 0,
            lastPlayed,
          },
        },
      },
      leaderboards: {},
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);

      // v1 → v2 → v3
      if (parsed.version === 1) {
        const v2 = migrateV1toV2(parsed);
        const v3 = migrateV2toV3(v2);
        try { localStorage.setItem(STORAGE_KEY + '_backup_v2', JSON.stringify(v2)); } catch (e) {}
        return v3;
      }

      // v2 → v3
      if (parsed.version === 2) {
        const v3 = migrateV2toV3(parsed);
        try { localStorage.setItem(STORAGE_KEY + '_backup_v2', JSON.stringify(parsed)); } catch (e) {}
        return v3;
      }

      // v3 (current)
      if (parsed.version === SCHEMA_VERSION) {
        return parsed;
      }

      // Versão desconhecida (futuro?) → fallback
      return defaultState();
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  let recentExercises = []; // cache dos últimos 3 (chaves canónicas)

  function exerciseKey(parcelas) {
    return parcelas.slice().sort((a, b) => a - b).join(',');
  }

  function clearExerciseCache() {
    recentExercises = [];
  }

  // Quantas colunas mostra a tabela para um nível com `digits` dígitos
  // (mesmo número que digits porque a magnitude máxima determina as colunas).
  function numColumns(digits) {
    return digits;
  }

  // Calcula resultados e transportes esperados, coluna a coluna.
  // Devolve { results: [...], carries: [...] } com índice 0 = unidades.
  // O array tem comprimento suficiente para conter o transporte final
  // (se o transporte da coluna mais alta for >0, adiciona uma coluna extra).
  function computeColumnSums(parcelas) {
    if (!Array.isArray(parcelas) || parcelas.length === 0) {
      throw new Error('parcelas deve ser um array não vazio');
    }
    if (!parcelas.every(n => Number.isInteger(n) && n >= 0)) {
      throw new Error('parcelas devem ser inteiros não negativos');
    }

    const maxDigits = Math.max(...parcelas.map(n => String(n).length));
    const results = [];
    const carries = [];
    let carry = 0;

    for (let col = 0; col < maxDigits; col++) {
      const divisor = Math.pow(10, col);
      const colSum = parcelas.reduce((acc, p) => acc + Math.floor(p / divisor) % 10, 0) + carry;
      results.push(colSum % 10);
      carry = Math.floor(colSum / 10);
      carries.push(carry);
    }

    // Se ainda há carry depois da coluna mais alta, adiciona coluna extra
    if (carry > 0) {
      results.push(carry);
      carries.push(0);
    }

    return { results, carries };
  }

  // True se a soma das parcelas tem pelo menos um transporte em alguma coluna.
  function hasAtLeastOneCarry(parcelas) {
    const { carries } = computeColumnSums(parcelas);
    return carries.some(c => c > 0);
  }

  // Compara input do utilizador contra valor esperado (algarismo 0-9).
  function validateSlot(input, expected) {
    if (input === null || input === undefined || input < 0 || input > 9 || !Number.isInteger(input)) {
      return { ok: false, expected };
    }
    if (input === expected) return { ok: true };
    return { ok: false, expected };
  }

  // Random integer in [min, max] inclusive
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Conta transportes na soma das parcelas
  function countCarries(parcelas) {
    const { carries } = computeColumnSums(parcelas);
    return carries.filter(c => c > 0).length;
  }

  // Gera nParcelas para um nível, respeitando heterogeneidade de magnitudes:
  // - Pelo menos 1 parcela mantém magnitude máxima ([10^(digits-1), 10^digits-1]).
  // - As restantes podem (50% prob) ter magnitude reduzida ([10^(digits-2), 10^digits-1])
  //   quando digits >= 3, garantindo exercícios mais realistas como "1234 + 567".
  // - Para digits == 2, comportamento idêntico (não há margem para "magnitude reduzida").
  function genHeterogeneousParcelas(digits, nParcelas) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const minLow = digits >= 3 ? Math.pow(10, digits - 2) : min;
    const guaranteedFullIdx = randInt(0, nParcelas - 1);
    const out = [];
    for (let i = 0; i < nParcelas; i++) {
      if (i === guaranteedFullIdx || digits < 3) {
        out.push(randInt(min, max));
      } else {
        const isLow = Math.random() < 0.5;
        out.push(isLow ? randInt(minLow, max) : randInt(min, max));
      }
    }
    return out;
  }

  // Gera um exercício aleatório válido para o nível dado.
  function generateExercise(level) {
    const { digits, parcelas: nParcelas, mode } = level;

    function tryAccept(parcelas) {
      if (!hasAtLeastOneCarry(parcelas)) return null;
      if (mode === 'col' && countCarries(parcelas) > 2) return null;
      const key = exerciseKey(parcelas);
      if (recentExercises.includes(key)) return null;
      recentExercises.push(key);
      if (recentExercises.length > 3) recentExercises.shift();
      return { parcelas, expected: computeColumnSums(parcelas) };
    }

    // Happy path
    for (let attempt = 0; attempt < 1000; attempt++) {
      const parcelas = genHeterogeneousParcelas(digits, nParcelas);
      const accepted = tryAccept(parcelas);
      if (accepted) return accepted;
    }

    // Fallback 1: força carry nas unidades a partir de parcelas heterogéneas.
    for (let attempt = 0; attempt < 200; attempt++) {
      const parcelas = genHeterogeneousParcelas(digits, nParcelas);
      const unitsSum = parcelas.reduce((s, p) => s + (p % 10), 0);
      if (unitsSum < 10) {
        const lastIdx = parcelas.length - 1;
        const needed = 10 - unitsSum;
        const currentLastUnit = parcelas[lastIdx] % 10;
        const newLastUnit = Math.min(9, currentLastUnit + needed);
        parcelas[lastIdx] = parcelas[lastIdx] - currentLastUnit + newLastUnit;
      }
      const accepted = tryAccept(parcelas);
      if (accepted) return accepted;
    }

    // Fallback 2 (último recurso, aleatório): aleatoriza unidades de parcelas
    // random até obter pelo menos 1 transporte, sem produzir o padrão fixo
    // antigo `[min+9, min+1, min, …]`. Não consulta cache para evitar loop infinito.
    for (let attempt = 0; attempt < 200; attempt++) {
      const parcelas = genHeterogeneousParcelas(digits, nParcelas);
      // Substituir as unidades por valores aleatórios e forçar soma >= 10
      let unitsTotal = 0;
      for (let i = 0; i < nParcelas; i++) {
        const u = randInt(0, 9);
        parcelas[i] = parcelas[i] - (parcelas[i] % 10) + u;
        unitsTotal += u;
      }
      if (unitsTotal < 10) {
        const lastIdx = nParcelas - 1;
        const need = 10 - unitsTotal;
        const currentLast = parcelas[lastIdx] % 10;
        parcelas[lastIdx] = parcelas[lastIdx] - currentLast + Math.min(9, currentLast + need);
      }
      if (!hasAtLeastOneCarry(parcelas)) continue;
      if (mode === 'col' && countCarries(parcelas) > 2) continue;
      return { parcelas, expected: computeColumnSums(parcelas) };
    }

    // Defensivo: se mesmo assim não conseguimos, lançamos. Em prática, os 1400
    // attempts acima são mais que suficientes para qualquer nível definido.
    throw new Error(`generateExercise: incapaz de gerar exercício válido para nível ${level.n}`);
  }

  function validateProfileName(name, existingNames) {
    if (typeof name !== 'string') return { ok: false, reason: 'empty' };
    const trimmed = name.trim();
    if (trimmed.length === 0) return { ok: false, reason: 'empty' };
    if (trimmed.length > 12) return { ok: false, reason: 'too-long' };
    // Letras (incluindo acentos) e espaço apenas
    if (!/^[A-Za-zÀ-ÿ ]+$/.test(trimmed)) return { ok: false, reason: 'invalid-chars' };
    const lower = trimmed.toLowerCase();
    const existing = (existingNames || []).map(n => String(n).toLowerCase());
    if (existing.includes(lower)) return { ok: false, reason: 'duplicate' };
    return { ok: true };
  }

  function listProfiles(state) {
    return Object.keys(state.profiles || {}).map(name => state.profiles[name]);
  }

  function getProfile(state, name) {
    return state.profiles ? state.profiles[name] : undefined;
  }

  function createProfile(state, name, avatar) {
    const trimmed = (typeof name === 'string') ? name.trim() : '';
    const existing = Object.keys(state.profiles || {});
    const validation = validateProfileName(trimmed, existing);
    if (!validation.ok) return { ok: false, reason: validation.reason };
    if (existing.length >= MAX_PROFILES) return { ok: false, reason: 'limit-reached' };
    const ava = AVATAR_OPTIONS.includes(avatar) ? avatar : DEFAULT_AVATAR;
    const newProfile = {
      name: trimmed,
      avatar: ava,
      createdAt: todayISO(),
      somas: emptyOperationProgress(),
    };
    const next = {
      ...state,
      profiles: { ...state.profiles, [trimmed]: newProfile },
      lastProfile: state.lastProfile || trimmed,
    };
    return { ok: true, state: next, profile: newProfile };
  }

  function deleteProfile(state, name) {
    if (!state.profiles || !state.profiles[name]) {
      return { ok: false, reason: 'not-found' };
    }
    const nextProfiles = { ...state.profiles };
    delete nextProfiles[name];
    const remaining = Object.keys(nextProfiles);
    const nextLast = state.lastProfile === name
      ? (remaining[0] || null)
      : state.lastProfile;
    return {
      ok: true,
      state: { ...state, profiles: nextProfiles, lastProfile: nextLast },
    };
  }

  function setActiveProfile(state, name) {
    if (!state.profiles || !state.profiles[name]) {
      return { ok: false, reason: 'not-found' };
    }
    return { ok: true, state: { ...state, lastProfile: name } };
  }

  function getActiveProfile(state) {
    if (!state.lastProfile) return null;
    return state.profiles ? state.profiles[state.lastProfile] || null : null;
  }

  function leaderboardKey(operation, mode) {
    return `${operation}:${mode}`;
  }

  function getLeaderboard(state, operation, mode) {
    if (!state.leaderboards) return [];
    const arr = state.leaderboards[leaderboardKey(operation, mode)];
    return Array.isArray(arr) ? arr.slice() : [];
  }

  function topN(state, operation, mode, n) {
    const list = getLeaderboard(state, operation, mode);
    return list.slice(0, Math.max(0, n));
  }

  function addLeaderboardEntry(state, operation, mode, entry) {
    if (typeof entry.points !== 'number' || entry.points <= 0) {
      return { ok: false, reason: 'no-points', state };
    }
    const key = leaderboardKey(operation, mode);
    const current = (state.leaderboards && Array.isArray(state.leaderboards[key]))
      ? state.leaderboards[key].slice()
      : [];
    current.push({
      profileName: String(entry.profileName || ''),
      avatar: String(entry.avatar || DEFAULT_AVATAR),
      points: entry.points,
      exercises: typeof entry.exercises === 'number' ? entry.exercises : 0,
      hitRateFirstTry: typeof entry.hitRateFirstTry === 'number' ? entry.hitRateFirstTry : 0,
      maxLevelReached: typeof entry.maxLevelReached === 'number' ? entry.maxLevelReached : 1,
      date: entry.date || todayISO(),
    });
    // Ordenar: pontos desc, exercícios desc, ordem de inserção (estável via Array.sort em V8 moderno)
    current.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.exercises || 0) - (a.exercises || 0);
    });
    const trimmed = current.slice(0, LEADERBOARD_MAX_ENTRIES);
    return {
      ok: true,
      state: {
        ...state,
        leaderboards: { ...state.leaderboards, [key]: trimmed },
      },
    };
  }

  function pointsForLevel(level, firstTry) {
    const lvl = Math.max(1, Math.min(12, Math.floor(level)));
    const base = 5 + 5 * lvl;       // nível 1 = 10, nível 12 = 65
    if (firstTry) return base;
    return Math.ceil(base / 2);
  }

  function nextLevelInRamp(currentLevel, hitsAtCurrent) {
    const lvl = Math.max(1, Math.min(12, Math.floor(currentLevel)));
    const hits = Math.max(0, Math.floor(hitsAtCurrent));
    if (hits + 1 >= HITS_TO_LEVEL_UP_TIMEATTACK && lvl < 12) {
      return { level: lvl + 1, hitsAtLevel: 0, leveledUp: true };
    }
    return { level: lvl, hitsAtLevel: hits + 1, leveledUp: false };
  }

  global.ContasLogic = {
    APP_VERSION,
    UPDATE_CHECK_INTERVAL_MS,
    LEVELS,
    SCHEMA_VERSION,
    MAX_PROFILES,
    AVATAR_OPTIONS,
    DEFAULT_AVATAR,
    POINTS_TO_LEVELUP,
    HITS_TO_LEVEL_UP_TIMEATTACK,
    TIME_ATTACK_DURATION_S,
    LEADERBOARD_MAX_ENTRIES,
    POINTS_FIRST_TRY,
    POINTS_RETRY,
    numColumns,
    computeColumnSums,
    hasAtLeastOneCarry,
    validateSlot,
    validateProfileName,
    generateExercise,
    clearExerciseCache,
    computePointsForExercise,
    loadState,
    saveState,
    resetState,
    defaultState,
    migrateV2toV3,
    emptyOperationProgress,
    todayISO,
    listProfiles,
    getProfile,
    createProfile,
    deleteProfile,
    setActiveProfile,
    getActiveProfile,
    getLeaderboard,
    topN,
    addLeaderboardEntry,
    pointsForLevel,
    nextLevelInRamp,
  };
})(window);
