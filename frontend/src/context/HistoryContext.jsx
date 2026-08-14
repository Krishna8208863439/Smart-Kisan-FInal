import { createContext, useContext, useCallback } from "react";

const HISTORY_KEY = "sk_activity_history";
const MAX_ENTRIES = 200;

const HistoryContext = createContext(null);

// ── Utility: read from localStorage ───────────────────────────────────────
function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Utility: write to localStorage ────────────────────────────────────────
function writeHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Storage full — silently ignore
  }
}

export const HistoryProvider = ({ children }) => {
  // Add a new entry — deduplicates by id, trims to MAX_ENTRIES
  const addHistoryEntry = useCallback((entry) => {
    const entries = readHistory();
    const newEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    // Prepend and trim
    const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);
    writeHistory(updated);
  }, []);

  // Get all entries sorted newest first
  const getHistory = useCallback(() => {
    return readHistory().sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, []);

  // Delete one entry
  const clearEntry = useCallback((id) => {
    const entries = readHistory().filter((e) => e.id !== id);
    writeHistory(entries);
  }, []);

  // Clear everything
  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return (
    <HistoryContext.Provider
      value={{ addHistoryEntry, getHistory, clearEntry, clearHistory }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
};

export default HistoryContext;
