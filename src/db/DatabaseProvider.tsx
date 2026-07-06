import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { openAppDatabase } from './openAppDatabase';
import { makeFoodsRepository } from './repositories/foodsRepository';
import { makeFoodLogRepository } from './repositories/foodLogRepository';
import { seedFoods } from './seed';
import { getTheme } from '../theme/tokens';

export interface Db {
  foods: ReturnType<typeof makeFoodsRepository>;
  foodLog: ReturnType<typeof makeFoodLogRepository>;
}

const DbContext = createContext<Db | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const theme = getTheme(useColorScheme() === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    let active = true;
    (async () => {
      const exec = await openAppDatabase();
      const foods = makeFoodsRepository(exec);
      const foodLog = makeFoodLogRepository(exec);
      await seedFoods(foods, Date.now());
      if (active) setDb({ foods, foodLog });
    })();
    return () => { active = false; };
  }, []);

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
