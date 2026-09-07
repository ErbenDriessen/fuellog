import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, useColorScheme } from 'react-native';
import { openAppDatabase } from './openAppDatabase';
import { makeFoodsRepository } from './repositories/foodsRepository';
import { makeFoodLogRepository } from './repositories/foodLogRepository';
import { makeDailyTargetsRepository } from './repositories/dailyTargetsRepository';
import { makeRecipesRepository } from './repositories/recipesRepository';
import { makeGymRepository } from './repositories/gymRepository';
import { makeSettingsRepository } from './repositories/settingsRepository';
import { makeWaterRepository } from './repositories/waterRepository';
import { makeEnergyRepository } from './repositories/energyRepository';
import { makeReflectionsRepository } from './repositories/reflectionsRepository';
import { seedFoods, seedDailyTarget, seedExercises } from './seed';
import { getTheme } from '../theme/tokens';
import { todayISO } from '../food/date';

export interface Db {
  foods: ReturnType<typeof makeFoodsRepository>;
  foodLog: ReturnType<typeof makeFoodLogRepository>;
  dailyTargets: ReturnType<typeof makeDailyTargetsRepository>;
  recipes: ReturnType<typeof makeRecipesRepository>;
  gym: ReturnType<typeof makeGymRepository>;
  settings: ReturnType<typeof makeSettingsRepository>;
  water: ReturnType<typeof makeWaterRepository>;
  energy: ReturnType<typeof makeEnergyRepository>;
  reflections: ReturnType<typeof makeReflectionsRepository>;
}

const DbContext = createContext<Db | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const theme = getTheme(useColorScheme() === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const exec = await openAppDatabase();
        const foods = makeFoodsRepository(exec);
        const foodLog = makeFoodLogRepository(exec);
        const dailyTargets = makeDailyTargetsRepository(exec);
        const recipes = makeRecipesRepository(exec);
        const gym = makeGymRepository(exec);
        const settings = makeSettingsRepository(exec);
        const water = makeWaterRepository(exec);
        const energy = makeEnergyRepository(exec);
        const reflections = makeReflectionsRepository(exec);
        await seedFoods(foods, Date.now());
        await seedDailyTarget(dailyTargets, todayISO());
        await seedExercises({ all: () => gym.allExercises(), add: (e) => gym.addExercise(e) });
        if (active) setDb({ foods, foodLog, dailyTargets, recipes, gym, settings, water, energy, reflections });
      } catch (err) {
        // Surface DB open/migrate/seed failures instead of hanging on the
        // loading spinner forever (which is indistinguishable from a blank screen).
        console.error('[DatabaseProvider] failed to initialize the database', err);
        if (active) setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <View
        testID="db-error"
        style={{
          flex: 1,
          backgroundColor: theme.colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing(6),
        }}
      >
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: theme.spacing(2) }}>
          Couldn’t open the database
        </Text>
        <Text style={{ color: theme.colors.text2, fontSize: 14, textAlign: 'center' }}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!db) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): Db {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used within a DatabaseProvider');
  return db;
}
