import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { FoodLogEntry } from '../src/db/repositories/foodLogRepository';
import { Food } from '../src/db/repositories/foodsRepository';
import { Macros, roundMacros, scaleMacros } from '../src/food/macros';
import { sanitizeDecimal } from '../src/food/number';

export default function EditEntryScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { foodLog, foods } = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<FoodLogEntry | null>(null);
  const [food, setFood] = useState<Food | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [grams, setGrams] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [foundEntry, allFoods] = await Promise.all([foodLog.byId(id), foods.all()]);
      if (!active) return;
      setEntry(foundEntry);
      if (foundEntry) {
        setFood(allFoods.find((f: Food) => f.id === foundEntry.foodId) ?? null);
        setGrams(String(foundEntry.grams));
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [foodLog, foods, id]);

  function updateGrams(text: string) {
    setGrams(sanitizeDecimal(text));
  }

  const parsedGrams = Number(grams);
  const validGrams = grams !== '' && parsedGrams > 0;

  function computeMacros(): Macros | null {
    if (!entry) return null;
    if (food) {
      return roundMacros(scaleMacros(food, validGrams ? parsedGrams : 0));
    }
    if (entry.grams > 0) {
      const factor = (validGrams ? parsedGrams : 0) / entry.grams;
      return roundMacros({
        kcal: entry.kcal * factor,
        protein: entry.protein * factor,
        carb: entry.carb * factor,
        fat: entry.fat * factor,
      });
    }
    return roundMacros({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  }

  const macros = computeMacros();

  async function handleSave() {
    if (!entry || !validGrams || saving) return;
    setSaving(true);
    setError(null);
    try {
      const computed = computeMacros();
      if (!computed) return;
      const updated: FoodLogEntry = {
        ...entry,
        grams: parsedGrams,
        kcal: computed.kcal,
        protein: computed.protein,
        carb: computed.carb,
        fat: computed.fat,
      };
      await foodLog.update(updated);
      router.back();
    } catch {
      if (mountedRef.current) {
        setError('Could not save changes. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert('Delete entry?', 'This will remove the entry from your log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await foodLog.remove(entry.id);
            router.back();
          } catch {
            if (mountedRef.current) {
              setError('Could not delete entry. Please try again.');
            }
          }
        },
      },
    ]);
  }

  if (loaded && !entry) {
    return (
      <View testID="screen-edit-entry" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.notFoundWrap, { paddingHorizontal: theme.spacing(5) }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Entry not found</Text>
          <Pressable
            testID="close-edit-entry-button"
            onPress={() => router.back()}
            style={[
              styles.saveButton,
              { backgroundColor: theme.colors.accent, borderRadius: theme.radius.full, marginTop: theme.spacing(6) },
            ]}
          >
            <Text style={styles.saveButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const foodName = (entry?.foodId && food?.name) || 'Food';

  return (
    <View testID="screen-edit-entry" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <View
        style={[
          styles.header,
          { paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(3) },
        ]}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.closeButton, { backgroundColor: theme.colors.surface2 }]}
        >
          <Ionicons name="close" size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.text }]}>Edit entry</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        {entry && (
          <>
            <Text style={[styles.foodName, { color: theme.colors.text, marginTop: theme.spacing(2) }]}>
              {foodName}
            </Text>
            <Text style={[styles.mealLabel, { color: theme.colors.text3, marginTop: theme.spacing(1) }]}>
              {entry.meal}
            </Text>

            <View style={{ marginTop: theme.spacing(5) }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text2 }]}>Grams</Text>
              <TextInput
                testID="edit-grams-input"
                value={grams}
                onChangeText={updateGrams}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.md,
                    marginTop: theme.spacing(1),
                  },
                ]}
              />
            </View>

            {macros && (
              <View style={[styles.macroCard, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, marginTop: theme.spacing(5), padding: theme.spacing(5) }]}>
                <Text style={[styles.kcalValue, { color: theme.colors.text }]}>{macros.kcal} kcal</Text>
                <View style={[styles.macroRow, { marginTop: theme.spacing(3) }]}>
                  <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {macros.protein}g</Text>
                  <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {macros.carb}g</Text>
                  <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {macros.fat}g</Text>
                </View>
              </View>
            )}

            {error && (
              <Text
                testID="save-entry-error"
                style={[styles.errorText, { color: theme.colors.accent, marginTop: theme.spacing(4) }]}
              >
                {error}
              </Text>
            )}

            <Pressable
              testID="save-entry-button"
              disabled={!validGrams || saving}
              onPress={handleSave}
              style={[
                styles.saveButton,
                {
                  backgroundColor: !validGrams || saving ? theme.colors.track : theme.colors.accent,
                  borderRadius: theme.radius.full,
                  marginTop: theme.spacing(6),
                  paddingVertical: theme.spacing(3),
                },
              ]}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: !validGrams || saving ? theme.colors.text3 : '#ffffff' },
                ]}
              >
                Save
              </Text>
            </Pressable>

            <Pressable
              testID="delete-entry-button"
              onPress={handleDelete}
              style={[styles.deleteButton, { marginTop: theme.spacing(4), paddingVertical: theme.spacing(3) }]}
            >
              <Text style={[styles.deleteButtonText, { color: theme.colors.accent }]}>Delete entry</Text>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodName: {
    fontSize: 20,
    fontWeight: '700',
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  macroCard: {},
  kcalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
  },
  macroText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
