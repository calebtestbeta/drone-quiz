export const PRACTICAL_SESSION_KEY = 'dq_practical_sessions';
export const MAX_PRACTICAL_SESSIONS = 50;

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createSessionStore(storage = globalThis.localStorage) {
  function list() {
    try {
      return safeParse(storage?.getItem(PRACTICAL_SESSION_KEY));
    } catch {
      return [];
    }
  }

  function add(session) {
    const sessions = list();
    sessions.unshift({ version: 1, ...session });
    sessions.length = Math.min(sessions.length, MAX_PRACTICAL_SESSIONS);
    try {
      storage?.setItem(PRACTICAL_SESSION_KEY, JSON.stringify(sessions));
      return true;
    } catch {
      return false;
    }
  }

  return { list, add };
}
