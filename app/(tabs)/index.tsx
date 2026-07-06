import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { useDb } from '../../src/db/DatabaseProvider';
import { getTheme, Theme } from '../../src/theme/tokens';
import { FoodLogEntry } from '../../src/db/repositories/foodLogRepository';
import { DailyTarget } from '../../src/db/repositories/dailyTargetsRepository';
import { roundMacros, sumMacros } from '../../src/food/macros';
import { Food } from '../../src/db/repositories/foodsRepository';
import { todayISO } from '../../src/food/date';
import { computeDayProgress, MetricProgress } from '../../src/food/targets';
import { Ring } from '../../src/components/Ring';

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function groupByMeal(entries: FoodLogEntry[]): { meal: string; entries: FoodLogEntry[] }[] {
  const groups = new Map<string, FoodLogEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.meal) ?? [];
    list.push(entry);
    groups.set(entry.meal, list);
  }
  return Array.from(groups.entries())
    .sort((a, b) => {
      const ai = MEAL_ORDER.indexOf(a[0]);
      const bi = MEAL_ORDER.indexOf(b[0]);
      return (ai === -1 ? MEAL_ORDER.length : ai) - (bi === -1 ? MEAL_ORDER.length : bi);
    })
    .map(([meal, list]) => ({ meal, entries: list }));
}

function MacroMiniRing({
  theme,
  label,
  color,
  metric,
  testID,
}: {
  theme: Theme;
  label: string;
  color: string;
  metric: MetricProgress;
  testID: string;
}) {
  return (
    <View style={styles.macroItem}>
      <Ring size={74} stroke={8} pct={metric.pct} color={color} trackColor={theme.colors.track} testID={testID}>
        <Text style={[styles.miniRingValue, { color: theme.colors.text }]}>{metric.eaten}</Text>
        <Text style={[styles.miniRingTarget, { color: theme.colors.text3 }]}>/{metric.target}g</Text>
      </Ring>
      <Text style={[styles.macroLabel, { color: theme.colors.text3, marginTop: theme.spacing(1) }]}>{label}</Text>
    </View>
  );
}

export default function FoodScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { foodLog, foods, dailyTargets } = useDb();

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [foodNames, setFoodNames] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<DailyTarget | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [rows, allFoods, currentTarget] = await Promise.all([
          foodLog.entriesForDate(todayISO()),
          foods.all(),
          dailyTargets.current(),
        ]);
        if (active) {
          setEntries(rows);
          setFoodNames(Object.fromEntries(allFoods.map((f: Food) => [f.id, f.name])));
          setTarget(currentTarget);
          setLoaded(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [foodLog, foods, dailyTargets]),
  );

  const total = roundMacros(
    sumMacros(entries.map((e) => ({ kcal: e.kcal, protein: e.protein, carb: e.carb, fat: e.fat }))),
  );
  const progress = target ? computeDayProgress(target, total) : null;
  const groups = groupByMeal(entries);

  return (
    <View
      testID="screen-food"
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
    >
      <View style={{ paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5) }}>
        <Text style={[styles.heading, { color: theme.colors.text }]}>Today</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text2, marginTop: theme.spacing(1) }]}>
          {todayLabel()}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              padding: theme.spacing(5),
              marginTop: theme.spacing(5),
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.totalLabel, { color: theme.colors.text3 }]}>today's total</Text>
            <Pressable
              testID="edit-targets-button"
              accessibilityLabel="Edit targets"
              onPress={() => router.push('/edit-targets')}
              hitSlop={10}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.text3} />
            </Pressable>
          </View>

          {progress ? (
            <>
              <View style={[styles.heroRingWrap, { marginTop: theme.spacing(3) }]}>
                <Ring
                  size={180}
                  stroke={16}
                  pct={progress.kcal.pct}
                  color={theme.colors.accent}
                  trackColor={theme.colors.track}
                  testID="kcal-ring"
                >
                  <Text style={[styles.heroRemaining, { color: theme.colors.text }]}>
                    {Math.round(Math.abs(progress.kcal.remaining))}
                  </Text>
                  <Text style={[styles.heroLabel, { color: theme.colors.text3 }]}>
                    {progress.kcal.remaining < 0 ? 'KCAL OVER' : 'KCAL LEFT'}
                  </Text>
                  <Text style={[styles.heroEatenTarget, { color: theme.colors.text2 }]}>
                    {progress.kcal.eaten} / {progress.kcal.target}
                  </Text>
                </Ring>
              </View>

              <View style={[styles.macroRow, { marginTop: theme.spacing(5) }]}>
                <MacroMiniRing
                  theme={theme}
                  label="Protein"
                  color={theme.colors.protein}
                  metric={progress.protein}
                  testID="protein-ring"
                />
                <MacroMiniRing
                  theme={theme}
                  label="Carbs"
                  color={theme.colors.carbs}
                  metric={progress.carb}
                  testID="carb-ring"
                />
                <MacroMiniRing
                  theme={theme}
                  label="Fat"
                  color={theme.colors.fat}
                  metric={progress.fat}
                  testID="fat-ring"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.totalKcal, { color: theme.colors.text, marginTop: theme.spacing(2) }]}>
                {total.kcal} kcal
              </Text>
              <View style={[styles.macroRow, { marginTop: theme.spacing(3) }]}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: theme.colors.protein }]}>{total.protein}g</Text>
                  <Text style={[styles.macroLabel, { color: theme.colors.text3 }]}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: theme.colors.carbs }]}>{total.carb}g</Text>
                  <Text style={[styles.macroLabel, { color: theme.colors.text3 }]}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: theme.colors.fat }]}>{total.fat}g</Text>
                  <Text style={[styles.macroLabel, { color: theme.colors.text3 }]}>Fat</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <Pressable
          testID="add-meal-button"
          onPress={() => router.push('/build-meal')}
          style={[
            styles.addMealButton,
            {
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radius.full,
              marginTop: theme.spacing(4),
              paddingVertical: theme.spacing(3),
            },
          ]}
        >
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addMealText}>Add meal</Text>
        </Pressable>

        {loaded && entries.length === 0 && (
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.text3, marginTop: theme.spacing(8), textAlign: 'center' },
            ]}
          >
            No meals logged yet — tap + Add meal
          </Text>
        )}

        {groups.map((group) => (
          <View key={group.meal} style={{ marginTop: theme.spacing(6) }}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text2 }]}>{group.meal}</Text>
            {group.entries.map((entry) => (
              <Pressable
                key={entry.id}
                testID={`entry-row-${entry.id}`}
                onPress={() => router.push({ pathname: '/edit-entry', params: { id: entry.id } })}
                style={[
                  styles.entryRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing(3),
                    marginTop: theme.spacing(2),
                  },
                ]}
              >
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryName, { color: theme.colors.text }]} numberOfLines={1}>
                    {(entry.foodId && foodNames[entry.foodId]) || 'Food'}
                  </Text>
                  <Text style={[styles.entryGrams, { color: theme.colors.text2 }]}>{entry.grams} g</Text>
                </View>
                <View style={styles.entryMacros}>
                  <Text style={[styles.entryKcal, { color: theme.colors.text }]}>{entry.kcal} kcal</Text>
                  <View style={styles.entryMacroRow}>
                    <Text style={[styles.entryMacroText, { color: theme.colors.protein }]}>
                      P {entry.protein}g
                    </Text>
                    <Text style={[styles.entryMacroText, { color: theme.colors.carbs }]}>
                      C {entry.carb}g
                    </Text>
                    <Text style={[styles.entryMacroText, { color: theme.colors.fat }]}>F {entry.fat}g</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  totalKcal: {
    fontSize: 32,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRingWrap: {
    alignItems: 'center',
  },
  heroRemaining: {
    fontSize: 30,
    fontWeight: '700',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroEatenTarget: {
    fontSize: 12,
    marginTop: 4,
  },
  miniRingValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  miniRingTarget: {
    fontSize: 11,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addMealText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '600',
  },
  entryGrams: {
    fontSize: 14,
    fontWeight: '500',
  },
  entryMacros: {
    alignItems: 'flex-end',
  },
  entryKcal: {
    fontSize: 15,
    fontWeight: '700',
  },
  entryMacroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  entryMacroText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
