import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { useDb } from '../../src/db/DatabaseProvider';
import { useSettings } from '../../src/settings/SettingsProvider';
import { getTheme, Theme } from '../../src/theme/tokens';
import { FoodLogEntry } from '../../src/db/repositories/foodLogRepository';
import { DailyTarget } from '../../src/db/repositories/dailyTargetsRepository';
import { roundMacros, sumMacros } from '../../src/food/macros';
import { Food } from '../../src/db/repositories/foodsRepository';
import { todayISO } from '../../src/food/date';
import { computeDayProgress, MetricProgress } from '../../src/food/targets';
import { fullnessWord, fullnessSub, metricText } from '../../src/food/phrasing';
import { EnergyLevel, ENERGY_LEVELS } from '../../src/db/repositories/energyRepository';
import { Ring } from '../../src/components/Ring';

function dateLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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

const ENERGY_META: Record<EnergyLevel, { label: string; dot: string }> = {
  low: { label: 'Low', dot: '#B8A9A0' },
  okay: { label: 'Okay', dot: '#D2A05E' },
  good: { label: 'Good', dot: '#7C9F86' },
  bright: { label: 'Bright', dot: '#C58C6E' },
};

function SectionLabel({ theme, children, color }: { theme: Theme; children: string; color?: string }) {
  return <Text style={[styles.sectionLabel, { color: color ?? theme.colors.text2, fontFamily: theme.fonts.bodyHeavy }]}>{children}</Text>;
}

export default function FoodScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { foodLog, foods, dailyTargets, water, energy, reflections } = useDb();
  const { mode, waterGoal } = useSettings();

  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [foodNames, setFoodNames] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<DailyTarget | null>(null);
  const [glasses, setGlasses] = useState(0);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [reflection, setReflection] = useState('');
  const [loaded, setLoaded] = useState(false);

  const reflectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const day = todayISO();
      (async () => {
        const [rows, allFoods, currentTarget, w, e, r] = await Promise.all([
          foodLog.entriesForDate(day),
          foods.all(),
          dailyTargets.current(),
          water.getForDate(day),
          energy.getForDate(day),
          reflections.getForDate(day),
        ]);
        if (!active) return;
        setEntries(rows);
        setFoodNames(Object.fromEntries(allFoods.map((f: Food) => [f.id, f.name])));
        setTarget(currentTarget);
        setGlasses(w);
        setEnergyLevel(e);
        setReflection(r ?? '');
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [foodLog, foods, dailyTargets, water, energy, reflections]),
  );

  const total = roundMacros(
    sumMacros(entries.map((e) => ({ kcal: e.kcal, protein: e.protein, carb: e.carb, fat: e.fat }))),
  );
  const progress = target ? computeDayProgress(target, total) : null;
  const groups = groupByMeal(entries);
  const gentle = mode === 'gentle';
  const kcalPct = progress?.kcal.pct ?? 0;

  function addWater() {
    const next = glasses + 1 > waterGoal ? 0 : glasses + 1;
    setGlasses(next);
    void water.setForDate(todayISO(), next);
  }

  function pickEnergy(level: EnergyLevel) {
    setEnergyLevel(level);
    void energy.setForDate(todayISO(), level);
  }

  function saveReflection(text: string) {
    void reflections.setForDate(todayISO(), text, Date.now());
  }

  function onReflectionChange(text: string) {
    setReflection(text);
    if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
    reflectionTimer.current = setTimeout(() => saveReflection(text), 500);
  }

  function onReflectionBlur() {
    if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
    saveReflection(reflection);
  }

  const macros = progress
    ? ([
        { key: 'protein', name: 'Protein', color: theme.colors.protein, metric: progress.protein },
        { key: 'carbs', name: 'Carbs', color: theme.colors.carbs, metric: progress.carb },
        { key: 'fat', name: 'Fat', color: theme.colors.fat, metric: progress.fat },
      ] as { key: string; name: string; color: string; metric: MetricProgress }[])
    : [];

  const showReflection = loaded && (new Date().getHours() >= 18 || groups.length >= 2);

  return (
    <View testID="screen-food" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <View style={{ paddingTop: theme.spacing(16), paddingHorizontal: theme.spacing(5) }}>
        <Text style={[styles.dateLabel, { color: theme.colors.text2, fontFamily: theme.fonts.bodyBold }]}>
          {dateLabel().toUpperCase()}
        </Text>
        <Text style={[styles.greeting, { color: theme.colors.text, fontFamily: theme.fonts.serif, marginTop: theme.spacing(2) }]}>
          {greeting()}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: theme.spacing(12) }}
      >
        {/* Nourishment */}
        <View style={[styles.card, theme.shadow.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, marginHorizontal: theme.spacing(4), marginTop: theme.spacing(5), padding: theme.spacing(5) }]}>
          <View style={styles.cardHeader}>
            <SectionLabel theme={theme}>TODAY&apos;S NOURISHMENT</SectionLabel>
            <Pressable testID="edit-targets-button" onPress={() => router.push('/edit-targets')} hitSlop={8}>
              <Text style={[styles.linkText, { color: theme.colors.accent, fontFamily: theme.fonts.bodyBold }]}>Targets</Text>
            </Pressable>
          </View>

          <View style={{ alignItems: 'center', marginTop: theme.spacing(4) }}>
            <Ring
              size={186}
              stroke={18}
              pct={kcalPct}
              color={theme.colors.accent}
              trackColor={theme.colors.track}
              testID="kcal-ring"
              animate
            >
              {gentle ? (
                <>
                  <Text style={[styles.ringWord, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}>
                    {fullnessWord(kcalPct)}
                  </Text>
                  <Text style={[styles.ringSub, { color: theme.colors.text2, fontFamily: theme.fonts.body }]}>
                    {fullnessSub(kcalPct)}
                  </Text>
                </>
              ) : progress ? (
                <>
                  <Text style={[styles.ringNumber, { color: theme.colors.text, fontFamily: theme.fonts.serif }]}>
                    {Math.round(Math.abs(progress.kcal.remaining))}
                  </Text>
                  <Text style={[styles.ringUnit, { color: theme.colors.text2, fontFamily: theme.fonts.bodyBold }]}>
                    {progress.kcal.remaining < 0 ? 'KCAL OVER' : 'KCAL LEFT'}
                  </Text>
                  <Text style={[styles.ringPair, { color: theme.colors.text2, fontFamily: theme.fonts.body }]}>
                    {progress.kcal.eaten} / {progress.kcal.target}
                  </Text>
                </>
              ) : null}
            </Ring>
          </View>

          <View style={{ marginTop: theme.spacing(5), gap: theme.spacing(3) }}>
            {macros.map((m) => (
              <View key={m.key} testID={`${m.key === 'carbs' ? 'carb' : m.key}-ring`}>
                <View style={styles.macroTop}>
                  <Text style={[styles.macroName, { color: theme.colors.text, fontFamily: theme.fonts.bodyBold }]}>{m.name}</Text>
                  <Text style={[styles.macroValue, { color: theme.colors.text2, fontFamily: theme.fonts.body }]}>
                    {metricText(mode, m.metric)}
                  </Text>
                </View>
                <View style={[styles.macroTrack, { backgroundColor: theme.colors.track }]}>
                  <View style={{ height: '100%', borderRadius: 99, width: `${Math.round(m.metric.pct * 100)}%`, backgroundColor: m.color }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Water + Energy */}
        <View style={{ flexDirection: 'row', gap: theme.spacing(3), marginHorizontal: theme.spacing(4), marginTop: theme.spacing(3) }}>
          <View style={[styles.pairCard, theme.shadow.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(4) }]}>
            <SectionLabel theme={theme}>WATER</SectionLabel>
            <View style={styles.glassRow}>
              {Array.from({ length: waterGoal }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.glass,
                    i < glasses
                      ? { backgroundColor: theme.colors.water }
                      : { backgroundColor: theme.colors.waterSoft, borderWidth: 1.5, borderColor: theme.colors.border },
                  ]}
                />
              ))}
            </View>
            <Pressable
              testID="water-add"
              onPress={addWater}
              style={[styles.waterButton, { backgroundColor: theme.colors.waterSoft, borderRadius: theme.radius.full }]}
            >
              <Text style={[styles.waterButtonText, { color: theme.colors.waterInk, fontFamily: theme.fonts.bodyBold }]}>+ a glass</Text>
            </Pressable>
          </View>

          <View style={[styles.pairCard, theme.shadow.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(4) }]}>
            <SectionLabel theme={theme}>ENERGY</SectionLabel>
            <View style={{ marginTop: theme.spacing(3), gap: theme.spacing(2) }}>
              {ENERGY_LEVELS.map((level) => {
                const selected = energyLevel === level;
                return (
                  <Pressable
                    key={level}
                    testID={`energy-${level}`}
                    onPress={() => pickEnergy(level)}
                    style={[
                      styles.energyRow,
                      { borderRadius: theme.radius.sm, backgroundColor: selected ? theme.colors.surface2 : 'transparent' },
                    ]}
                  >
                    <View style={[styles.energyDot, { backgroundColor: ENERGY_META[level].dot }]} />
                    <Text style={[styles.energyLabel, { color: theme.colors.text, fontFamily: theme.fonts.bodyBold }]}>
                      {ENERGY_META[level].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* What you've eaten */}
        <View style={{ paddingHorizontal: theme.spacing(5), marginTop: theme.spacing(6) }}>
          <SectionLabel theme={theme}>WHAT YOU&apos;VE EATEN</SectionLabel>

          {loaded && entries.length === 0 && (
            <View style={[{ backgroundColor: theme.colors.surface2, borderRadius: theme.radius.lg, padding: theme.spacing(5), marginTop: theme.spacing(3) }]}>
              <Text style={[styles.emptyText, { color: theme.colors.text2, fontFamily: theme.fonts.body, textAlign: 'center' }]}>
                Nothing written down yet. Whenever you&apos;re ready.
              </Text>
            </View>
          )}

          {groups.map((group) => {
            const mealKcal = Math.round(group.entries.reduce((s, e) => s + e.kcal, 0));
            const count = group.entries.length;
            return (
              <View
                key={group.meal}
                style={[styles.mealCard, theme.shadow.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(3), marginTop: theme.spacing(3) }]}
              >
                <View style={styles.mealHeader}>
                  <View style={[styles.thumb, { backgroundColor: theme.colors.surface2, borderRadius: theme.radius.md }]}>
                    <Text style={[styles.thumbText, { color: theme.colors.text3 }]}>photo</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.slotLabel, { color: theme.colors.text2, fontFamily: theme.fonts.bodyBold }]}>
                      {group.meal.toUpperCase()}
                    </Text>
                    <Text style={[styles.mealMeta, { color: theme.colors.text2, fontFamily: theme.fonts.body, marginTop: 2 }]}>
                      {gentle ? `${count} ${count === 1 ? 'thing' : 'things'}` : `${mealKcal} kcal · ${count} ${count === 1 ? 'item' : 'items'}`}
                    </Text>
                  </View>
                </View>
                {group.entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    testID={`entry-row-${entry.id}`}
                    onPress={() => router.push({ pathname: '/edit-entry', params: { id: entry.id } })}
                    style={[styles.entryRow, { borderTopColor: theme.colors.surface2 }]}
                  >
                    <Text style={[styles.entryName, { color: theme.colors.text, fontFamily: theme.fonts.body }]} numberOfLines={1}>
                      {(entry.foodId && foodNames[entry.foodId]) || 'Food'}
                    </Text>
                    <Text style={[styles.entryMeta, { color: theme.colors.text2, fontFamily: theme.fonts.body }]}>
                      {gentle ? `${entry.grams} g` : `${entry.kcal} kcal`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            );
          })}

          <Pressable
            testID="add-meal-button"
            onPress={() => router.push('/build-meal')}
            style={[styles.primaryButton, theme.shadow.button, { backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, marginTop: theme.spacing(4) }]}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={[styles.primaryButtonText, { fontFamily: theme.fonts.bodyHeavy }]}>Add something you ate</Text>
          </Pressable>

          <Pressable
            testID="saved-meals-button"
            onPress={() => router.push('/recipes')}
            style={[styles.outlineButton, { borderColor: theme.colors.border, borderRadius: theme.radius.md, marginTop: theme.spacing(2) }]}
          >
            <Text style={[styles.outlineButtonText, { color: theme.colors.text, fontFamily: theme.fonts.bodyBold }]}>Your usual meals</Text>
          </Pressable>
        </View>

        {/* Evening reflection */}
        {showReflection && (
          <View style={[{ backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.xl, marginHorizontal: theme.spacing(4), marginTop: theme.spacing(6), padding: theme.spacing(5) }]}>
            <SectionLabel theme={theme} color={theme.colors.accentInk}>BEFORE BED</SectionLabel>
            <Text style={[styles.reflectPrompt, { color: theme.colors.text, fontFamily: theme.fonts.serif, marginTop: theme.spacing(2) }]}>
              What was good about today?
            </Text>
            <TextInput
              testID="reflection-input"
              value={reflection}
              onChangeText={onReflectionChange}
              onBlur={onReflectionBlur}
              placeholder="A line is enough…"
              placeholderTextColor={theme.colors.text3}
              multiline
              style={[styles.reflectInput, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, color: theme.colors.text, fontFamily: theme.fonts.body, marginTop: theme.spacing(3) }]}
            />
            <Text style={[styles.reflectNote, { color: theme.colors.accentInk, fontFamily: theme.fonts.body, marginTop: theme.spacing(2) }]}>
              Saved only for you — nothing is scored.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  dateLabel: { fontSize: 12, letterSpacing: 1.2 },
  greeting: { fontSize: 31, letterSpacing: -0.3 },
  card: {},
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' },
  linkText: { fontSize: 13 },
  ringWord: { fontSize: 25, lineHeight: 29, textAlign: 'center' },
  ringSub: { fontSize: 12.5, marginTop: 6, textAlign: 'center' },
  ringNumber: { fontSize: 33, lineHeight: 34 },
  ringUnit: { fontSize: 11.5, letterSpacing: 1, marginTop: 4 },
  ringPair: { fontSize: 12.5, marginTop: 6 },
  macroTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  macroName: { fontSize: 14 },
  macroValue: { fontSize: 13 },
  macroTrack: { marginTop: 7, height: 9, borderRadius: 99, overflow: 'hidden' },
  pairCard: { flex: 1 },
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  glass: { width: 18, height: 24, borderRadius: 6, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  waterButton: { marginTop: 14, height: 44, alignItems: 'center', justifyContent: 'center' },
  waterButtonText: { fontSize: 14 },
  energyRow: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  energyDot: { width: 10, height: 10, borderRadius: 5 },
  energyLabel: { fontSize: 13.5 },
  emptyText: { fontSize: 14, lineHeight: 21 },
  mealCard: {},
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  thumbText: { fontSize: 9 },
  slotLabel: { fontSize: 11.5, letterSpacing: 0.9, textTransform: 'uppercase' },
  mealMeta: { fontSize: 13 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  entryName: { fontSize: 14.5, flex: 1, marginRight: 8 },
  entryMeta: { fontSize: 13 },
  primaryButton: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 16.5 },
  outlineButton: { height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  outlineButtonText: { fontSize: 15 },
  reflectPrompt: { fontSize: 20, lineHeight: 26 },
  reflectInput: { minHeight: 76, padding: 13, fontSize: 14.5, textAlignVertical: 'top' },
  reflectNote: { fontSize: 12.5 },
});
