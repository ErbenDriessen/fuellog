import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useDb } from '../db/DatabaseProvider';
import { NumbersMode } from '../food/phrasing';
import {
  DEFAULT_NUMBERS_MODE,
  DEFAULT_REFLECTION_TIME,
  DEFAULT_WATER_GOAL,
} from '../db/repositories/settingsRepository';

interface SettingsContextValue {
  loading: boolean;
  mode: NumbersMode;
  setMode: (mode: NumbersMode) => Promise<void>;
  waterGoal: number;
  setWaterGoal: (glasses: number) => Promise<void>;
  onboarded: boolean;
  setOnboarded: (value: boolean) => Promise<void>;
  reflectionTime: string;
  setReflectionTime: (time: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Reads the persisted settings once on mount and shares them app-wide, so
// `mode` never has to be re-read per component. Setters persist then update
// state, keeping the UI and the database in step.
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useDb();
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<NumbersMode>(DEFAULT_NUMBERS_MODE);
  const [waterGoal, setWaterGoalState] = useState(DEFAULT_WATER_GOAL);
  const [onboarded, setOnboardedState] = useState(false);
  const [reflectionTime, setReflectionTimeState] = useState(DEFAULT_REFLECTION_TIME);

  useEffect(() => {
    let active = true;
    (async () => {
      const [m, g, o, t] = await Promise.all([
        settings.getNumbersMode(),
        settings.getWaterGoal(),
        settings.isOnboarded(),
        settings.getReflectionTime(),
      ]);
      if (!active) return;
      setModeState(m);
      setWaterGoalState(g);
      setOnboardedState(o);
      setReflectionTimeState(t);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [settings]);

  const setMode = useCallback(
    async (next: NumbersMode) => {
      setModeState(next);
      await settings.setNumbersMode(next);
    },
    [settings],
  );

  const setWaterGoal = useCallback(
    async (glasses: number) => {
      setWaterGoalState(glasses);
      await settings.setWaterGoal(glasses);
    },
    [settings],
  );

  const setOnboarded = useCallback(
    async (value: boolean) => {
      setOnboardedState(value);
      await settings.setOnboarded(value);
    },
    [settings],
  );

  const setReflectionTime = useCallback(
    async (time: string) => {
      setReflectionTimeState(time);
      await settings.setReflectionTime(time);
    },
    [settings],
  );

  return (
    <SettingsContext.Provider
      value={{
        loading,
        mode,
        setMode,
        waterGoal,
        setWaterGoal,
        onboarded,
        setOnboarded,
        reflectionTime,
        setReflectionTime,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
