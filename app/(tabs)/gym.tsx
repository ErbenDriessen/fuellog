import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useDb, Db } from '../../src/db/DatabaseProvider';
import { getTheme, Theme } from '../../src/theme/tokens';
import { SPLIT_TEMPLATES, SplitTemplate } from '../../src/gym/templates';
import { buildRoutineFromTemplate, Routine, RoutineDay, RoutineExercise, RoutineIds } from '../../src/gym/routine';
import { exerciseIdForSlug } from '../../src/gym/exercises';
import { nextRoutineDay } from '../../src/gym/rotation';

interface GymScreenState {
  exerciseNames: Record<string, string>;
  active: Routine | null;
  nextDay: RoutineDay | null;
  nextExercises: RoutineExercise[];
  dayCount: number;
}

const EMPTY_STATE: GymScreenState = {
  exerciseNames: {},
  active: null,
  nextDay: null,
  nextExercises: [],
  dayCount: 0,
};

async function loadGymScreenState(gym: Db['gym']): Promise<GymScreenState> {
  const [routines, allExercises] = await Promise.all([gym.routines(), gym.allExercises()]);
  const exerciseNames = Object.fromEntries(allExercises.map((e) => [e.id, e.name]));
  const active = routines[0] ?? null;
  if (!active) {
    return { ...EMPTY_STATE, exerciseNames };
  }
  const days = await gym.daysFor(active.id);
  const nextDay = nextRoutineDay(days, active.rotationPointer);
  const nextExercises = nextDay ? await gym.exercisesFor(nextDay.id) : [];
  return { exerciseNames, active, nextDay, nextExercises, dayCount: days.length };
}

function TemplateCard({
  theme,
  template,
  onPress,
}: {
  theme: Theme;
  template: SplitTemplate;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`template-${template.id}`}
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing(4),
          marginTop: theme.spacing(3),
        },
      ]}
    >
      <Text style={[styles.templateName, { color: theme.colors.text }]}>{template.name}</Text>
      <Text style={[styles.templateMeta, { color: theme.colors.text3, marginTop: theme.spacing(1) }]}>
        {template.days.length} day{template.days.length === 1 ? '' : 's'} ·{' '}
        {template.days.map((d) => d.name).join(' · ')}
      </Text>
    </Pressable>
  );
}

export default function GymScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { gym } = useDb();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<GymScreenState>(EMPTY_STATE);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        const next = await loadGymScreenState(gym);
        if (isActive) {
          setState(next);
          setLoaded(true);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [gym]),
  );

  async function handleSelectTemplate(template: SplitTemplate) {
    if (saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      const routineId = `routine-${now}`;
      const ids: RoutineIds = {
        routineId,
        makeDayId: (di) => `${routineId}-d${di}`,
        makeExerciseId: (di, ei) => `${routineId}-d${di}-e${ei}`,
      };
      const { routine, days, exercises } = buildRoutineFromTemplate(
        template,
        template.name,
        ids,
        exerciseIdForSlug,
        now,
      );
      await gym.saveRoutine(routine, days, exercises);
      const next = await loadGymScreenState(gym);
      setState(next);
      setLoaded(true);
      setShowPicker(false);
    } finally {
      setSaving(false);
    }
  }

  function handleStart() {
    router.push('/gym-day');
  }

  const { active, nextDay, nextExercises, exerciseNames, dayCount } = state;
  const showTemplates = showPicker || !active;
  const pointerIndex = active && dayCount > 0 ? ((active.rotationPointer % dayCount) + dayCount) % dayCount : 0;

  return (
    <View testID="screen-gym" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <View style={{ paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5) }}>
        <Text style={[styles.heading, { color: theme.colors.text }]}>
          {showTemplates ? 'Set up your split' : active?.name}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text2, marginTop: theme.spacing(1) }]}>
          {showTemplates ? 'Pick a split to build your routine' : `Next: Day ${pointerIndex + 1} of ${dayCount}`}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        {!loaded ? (
          <Text style={[styles.emptyText, { color: theme.colors.text3, marginTop: theme.spacing(8) }]}>
            Loading your split…
          </Text>
        ) : showTemplates ? (
          <>
            {SPLIT_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                theme={theme}
                template={template}
                onPress={() => handleSelectTemplate(template)}
              />
            ))}
          </>
        ) : (
          <>
            <View
              testID="next-session"
              style={[
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing(5),
                  marginTop: theme.spacing(5),
                },
              ]}
            >
              <Text style={[styles.dayName, { color: theme.colors.text }]}>{nextDay?.name}</Text>
              {nextExercises.map((exercise) => (
                <View
                  key={exercise.id}
                  testID={`exercise-row-${exercise.id}`}
                  style={[styles.exerciseRow, { marginTop: theme.spacing(3) }]}
                >
                  <Text style={[styles.exerciseName, { color: theme.colors.text }]} numberOfLines={1}>
                    {exerciseNames[exercise.exerciseId] ?? 'Exercise'}
                  </Text>
                  <Text style={[styles.exerciseTarget, { color: theme.colors.text2 }]}>
                    {exercise.targetSets} × {exercise.targetReps}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              testID="start-session"
              onPress={handleStart}
              style={[
                styles.startButton,
                {
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.full,
                  marginTop: theme.spacing(4),
                  paddingVertical: theme.spacing(3),
                },
              ]}
            >
              <Ionicons name="play" size={18} color="#ffffff" />
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>

            <Pressable
              testID="change-split-button"
              onPress={() => setShowPicker(true)}
              style={{ marginTop: theme.spacing(4), alignItems: 'center' }}
              hitSlop={8}
            >
              <Text style={[styles.changeSplitText, { color: theme.colors.text3 }]}>Change split</Text>
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
  emptyText: {
    fontSize: 15,
  },
  templateName: {
    fontSize: 17,
    fontWeight: '700',
  },
  templateMeta: {
    fontSize: 13,
  },
  dayName: {
    fontSize: 20,
    fontWeight: '700',
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  exerciseTarget: {
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  changeSplitText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
