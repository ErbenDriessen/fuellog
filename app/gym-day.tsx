import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useDb, Db } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { Routine, RoutineDay, RoutineExercise } from '../src/gym/routine';
import { nextRoutineDay, advanceRotationPointer } from '../src/gym/rotation';
import { progressiveOverloadHint, OverloadHint } from '../src/gym/overload';
import { WorkoutSession, LoggedSet } from '../src/gym/session';
import { sanitizeDecimal } from '../src/food/number';

interface SetRow {
  reps: string;
  weight: string;
  done: boolean;
}

interface GymDayState {
  active: Routine | null;
  day: RoutineDay | null;
  dayCount: number;
  exercises: RoutineExercise[];
  exerciseNames: Record<string, string>;
  hints: Record<string, OverloadHint | null>;
}

const EMPTY_STATE: GymDayState = {
  active: null,
  day: null,
  dayCount: 0,
  exercises: [],
  exerciseNames: {},
  hints: {},
};

function makeInitialRows(exercises: RoutineExercise[]): Record<string, SetRow[]> {
  const rows: Record<string, SetRow[]> = {};
  for (const ex of exercises) {
    const count = Math.max(1, ex.targetSets);
    rows[ex.id] = Array.from({ length: count }, () => ({ reps: '', weight: '', done: false }));
  }
  return rows;
}

// Re-derives the same "next session" the Gym tab shows, plus a progressive-
// overload hint per planned exercise from that exercise's last finished performance.
async function loadGymDayState(gym: Db['gym']): Promise<GymDayState> {
  const routines = await gym.routines();
  const active = routines[0] ?? null;
  if (!active) return EMPTY_STATE;

  const days = await gym.daysFor(active.id);
  const day = nextRoutineDay(days, active.rotationPointer);
  if (!day) return { ...EMPTY_STATE, active, dayCount: days.length };

  const [exercises, allExercises] = await Promise.all([gym.exercisesFor(day.id), gym.allExercises()]);
  const exerciseNames = Object.fromEntries(allExercises.map((e) => [e.id, e.name]));

  const hints: Record<string, OverloadHint | null> = {};
  for (const ex of exercises) {
    const last = await gym.lastSetsForExercise(ex.exerciseId);
    hints[ex.id] = progressiveOverloadHint(
      last.map((s) => ({ reps: s.reps, weight: s.weight })),
      ex.targetReps,
    );
  }

  return { active, day, dayCount: days.length, exercises, exerciseNames, hints };
}

function hintText(ex: RoutineExercise, hint: OverloadHint | null): string {
  if (!hint) return `No history yet — aim for ${ex.targetSets} × ${ex.targetReps}`;
  if (hint.progressed) {
    return `Last: ${ex.targetReps}+ reps @ ${hint.topWeight} kg → try ${hint.suggestedWeight} kg`;
  }
  return `Last: ${hint.topWeight} kg → aim to hit ${ex.targetReps} reps`;
}

export default function GymDayScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { gym } = useDb();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<GymDayState>(EMPTY_STATE);
  const [rowsByExercise, setRowsByExercise] = useState<Record<string, SetRow[]>>({});
  const [saving, setSaving] = useState(false);
  // Captured once so a long workout's elapsed time is accurate at Finish.
  const startedAtRef = useRef(Date.now());
  // Guards against a refocus (e.g. returning from a background app switch)
  // wiping sets the user already logged.
  const initializedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (initializedRef.current) return;
      let isActive = true;
      (async () => {
        const next = await loadGymDayState(gym);
        if (isActive) {
          setState(next);
          setRowsByExercise(makeInitialRows(next.exercises));
          setLoaded(true);
          initializedRef.current = true;
        }
      })();
      return () => {
        isActive = false;
      };
    }, [gym]),
  );

  const { active, day, dayCount, exercises, exerciseNames, hints } = state;
  const hasSession = active !== null && day !== null;

  function updateRow(exerciseId: string, index: number, patch: Partial<SetRow>) {
    setRowsByExercise((prev) => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addSetRow(exerciseId: string) {
    setRowsByExercise((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), { reps: '', weight: '', done: false }],
    }));
  }

  async function handleFinish() {
    if (!day || saving) return;
    setSaving(true);
    try {
      const sessionId = `session-${Date.now()}`;
      const sets: LoggedSet[] = [];
      for (const ex of exercises) {
        const rows = rowsByExercise[ex.id] ?? [];
        let setNumber = 0;
        for (const row of rows) {
          const hasBoth = row.reps.trim() !== '' && row.weight.trim() !== '';
          if (!row.done && !hasBoth) continue;
          const reps = parseInt(row.reps, 10);
          if (!Number.isFinite(reps) || reps <= 0) continue;
          const weightParsed = parseFloat(row.weight);
          const weight = Number.isFinite(weightParsed) ? weightParsed : 0;
          setNumber += 1;
          sets.push({
            id: `${sessionId}-${ex.id}-${setNumber}`,
            sessionId,
            exerciseId: ex.exerciseId,
            setNumber,
            reps,
            weight,
          });
        }
      }

      const session: WorkoutSession = {
        id: sessionId,
        routineDayId: day.id,
        startedAt: startedAtRef.current,
        finishedAt: Date.now(),
      };
      await gym.saveSession(session, sets);
      if (active) {
        await gym.setRotationPointer(active.id, advanceRotationPointer(active.rotationPointer, dayCount));
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View testID="screen-gym-day" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <View
        style={[
          styles.header,
          { paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(3) },
        ]}
      >
        <Pressable
          testID="gym-day-close"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.closeButton, { backgroundColor: theme.colors.surface2 }]}
        >
          <Ionicons name="close" size={20} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {day?.name ?? 'Workout'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text2 }]} numberOfLines={1}>
            {active?.name ?? 'Log your sets'}
          </Text>
        </View>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        {!loaded ? (
          <Text style={[styles.emptyText, { color: theme.colors.text3, marginTop: theme.spacing(8) }]}>
            Loading your session…
          </Text>
        ) : !hasSession ? (
          <View style={{ marginTop: theme.spacing(8), alignItems: 'center' }}>
            <Text style={[styles.emptyText, { color: theme.colors.text2, textAlign: 'center' }]}>
              {active ? 'No session to log yet.' : 'No routine yet — set up a split first.'}
            </Text>
          </View>
        ) : (
          <>
            {exercises.map((ex) => {
              const rows = rowsByExercise[ex.id] ?? [];
              return (
                <View
                  key={ex.id}
                  testID={`gym-exercise-${ex.id}`}
                  style={[
                    {
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radius.lg,
                      marginTop: theme.spacing(4),
                      padding: theme.spacing(4),
                    },
                  ]}
                >
                  <View style={styles.exerciseHeaderRow}>
                    <Text style={[styles.exerciseName, { color: theme.colors.text }]} numberOfLines={1}>
                      {exerciseNames[ex.exerciseId] ?? 'Exercise'}
                    </Text>
                    <Text style={[styles.exerciseTarget, { color: theme.colors.text2 }]}>
                      {ex.targetSets} × {ex.targetReps}
                    </Text>
                  </View>
                  <Text
                    testID={`hint-${ex.id}`}
                    style={[styles.hintText, { color: theme.colors.text3, marginTop: theme.spacing(1) }]}
                  >
                    {hintText(ex, hints[ex.id] ?? null)}
                  </Text>

                  <View style={{ marginTop: theme.spacing(3) }}>
                    {rows.map((row, index) => (
                      <View key={index} style={[styles.setRow, { marginTop: index === 0 ? 0 : theme.spacing(2) }]}>
                        <Text style={[styles.setNumber, { color: theme.colors.text3 }]}>{index + 1}</Text>
                        <TextInput
                          testID={`reps-input-${ex.id}-${index}`}
                          value={row.reps}
                          onChangeText={(text) => updateRow(ex.id, index, { reps: text.replace(/[^0-9]/g, '') })}
                          keyboardType="number-pad"
                          placeholder="reps"
                          placeholderTextColor={theme.colors.text3}
                          style={[
                            styles.setInput,
                            {
                              color: theme.colors.text,
                              backgroundColor: theme.colors.surface2,
                              borderRadius: theme.radius.sm,
                            },
                          ]}
                        />
                        <TextInput
                          testID={`weight-input-${ex.id}-${index}`}
                          value={row.weight}
                          onChangeText={(text) => updateRow(ex.id, index, { weight: sanitizeDecimal(text) })}
                          keyboardType="decimal-pad"
                          placeholder="kg"
                          placeholderTextColor={theme.colors.text3}
                          style={[
                            styles.setInput,
                            {
                              color: theme.colors.text,
                              backgroundColor: theme.colors.surface2,
                              borderRadius: theme.radius.sm,
                            },
                          ]}
                        />
                        <Pressable
                          testID={`set-check-${ex.id}-${index}`}
                          onPress={() => updateRow(ex.id, index, { done: !row.done })}
                          hitSlop={8}
                          style={[
                            styles.checkButton,
                            {
                              backgroundColor: row.done ? theme.colors.good : theme.colors.surface2,
                              borderRadius: theme.radius.full,
                            },
                          ]}
                        >
                          <Ionicons name="checkmark" size={16} color={row.done ? '#ffffff' : theme.colors.text3} />
                        </Pressable>
                      </View>
                    ))}

                    <Pressable
                      testID={`add-set-${ex.id}`}
                      onPress={() => addSetRow(ex.id)}
                      style={{ marginTop: theme.spacing(3) }}
                      hitSlop={8}
                    >
                      <Text style={[styles.addSetText, { color: theme.colors.accent }]}>+ Add set</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <Pressable
              testID="finish-session"
              onPress={handleFinish}
              disabled={saving}
              style={[
                styles.finishButton,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.full,
                  marginTop: theme.spacing(5),
                  paddingVertical: theme.spacing(3),
                  opacity: saving ? 0.7 : 1,
                },
              ]}
            >
              <Text style={styles.finishButtonText}>Finish</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  emptyText: {
    fontSize: 15,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  exerciseTarget: {
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 13,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    width: 18,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  checkButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  finishButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
