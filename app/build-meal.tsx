import { useEffect, useMemo, useState } from 'react';
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
import { router } from 'expo-router';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { Food } from '../src/db/repositories/foodsRepository';
import { roundMacros } from '../src/food/macros';
import { buildLogEntries, ingredientMacros, mealTotal, MealIngredient } from '../src/food/meal';
import { todayISO } from '../src/food/date';
import { sanitizeDecimal } from '../src/food/number';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

function defaultMeal(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'Breakfast';
  if (hour < 16) return 'Lunch';
  if (hour < 21) return 'Dinner';
  return 'Snack';
}

export default function BuildMealScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { foods, foodLog } = useDb();

  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [available, setAvailable] = useState<Food[]>([]);
  const [rows, setRows] = useState<{ food: Food; gramsText: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await foods.all();
      if (active) setAvailable(all);
    })();
    return () => {
      active = false;
    };
  }, [foods]);

  const items: MealIngredient[] = useMemo(
    () => rows.map((r) => ({ food: r.food, grams: Number(r.gramsText) || 0 })),
    [rows],
  );

  const validItems = useMemo(() => items.filter((i) => i.grams > 0), [items]);

  const total = useMemo(() => roundMacros(mealTotal(items)), [items]);

  function addIngredient(food: Food) {
    setRows((prev) => [...prev, { food, gramsText: '100' }]);
    setPickerOpen(false);
  }

  function updateGrams(index: number, text: string) {
    const sanitized = sanitizeDecimal(text);
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, gramsText: sanitized } : r)));
  }

  function removeIngredient(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleLogMeal() {
    if (validItems.length === 0 || saving) return;
    setSaving(true);
    try {
      const logDate = todayISO();
      const entries = buildLogEntries(validItems, {
        meal,
        logDate,
        makeId: (i) => `${Date.now()}-${i}`,
      });
      await foodLog.addMany(entries);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View testID="screen-build-meal" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Build a meal</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        <View style={[styles.chipRow, { marginTop: theme.spacing(2) }]}>
          {MEAL_TYPES.map((type) => {
            const selected = meal === type;
            return (
              <Pressable
                key={type}
                onPress={() => setMeal(type)}
                style={[
                  {
                    backgroundColor: selected ? theme.colors.accent : theme.colors.surface2,
                    borderRadius: theme.radius.full,
                    paddingHorizontal: theme.spacing(4),
                    paddingVertical: theme.spacing(2),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? '#ffffff' : theme.colors.text2 },
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: theme.spacing(6) }}>
          <Text style={[styles.sectionLabel, { color: theme.colors.text2 }]}>Ingredients</Text>

          {items.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.text3, marginTop: theme.spacing(3) }]}>
              No ingredients yet — add one below.
            </Text>
          ) : (
            items.map((item, index) => {
              const macros = roundMacros(ingredientMacros(item));
              return (
                <View
                  key={`${item.food.id}-${index}`}
                  style={[
                    styles.ingredientRow,
                    {
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radius.md,
                      borderColor: theme.colors.border,
                      padding: theme.spacing(3),
                      marginTop: theme.spacing(2),
                    },
                  ]}
                >
                  <View style={styles.ingredientInfo}>
                    <Text style={[styles.ingredientName, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.food.name}
                    </Text>
                    <Text style={[styles.ingredientKcal, { color: theme.colors.text2 }]}>
                      {macros.kcal} kcal
                    </Text>
                  </View>
                  <TextInput
                    testID={`grams-input-${index}`}
                    value={rows[index]?.gramsText ?? String(item.grams)}
                    onChangeText={(text) => updateGrams(index, text)}
                    keyboardType="decimal-pad"
                    style={[
                      styles.gramsInput,
                      {
                        color: theme.colors.text,
                        backgroundColor: theme.colors.surface2,
                        borderRadius: theme.radius.sm,
                      },
                    ]}
                  />
                  <Text style={[styles.gramsUnit, { color: theme.colors.text3 }]}>g</Text>
                  <Pressable
                    accessibilityLabel={`Remove ${item.food.name}`}
                    onPress={() => removeIngredient(index)}
                    hitSlop={8}
                    style={{ marginLeft: theme.spacing(2) }}
                  >
                    <Ionicons name="close-circle" size={22} color={theme.colors.text3} />
                  </Pressable>
                </View>
              );
            })
          )}

          <Pressable
            onPress={() => setPickerOpen((v) => !v)}
            style={[
              styles.addButton,
              {
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                marginTop: theme.spacing(3),
                paddingVertical: theme.spacing(3),
              },
            ]}
          >
            <Ionicons name={pickerOpen ? 'remove' : 'add'} size={18} color={theme.colors.accent} />
            <Text style={[styles.addButtonText, { color: theme.colors.accent }]}>Add ingredient</Text>
          </Pressable>

          {pickerOpen && (
            <View
              style={[
                styles.picker,
                { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, marginTop: theme.spacing(2) },
              ]}
            >
              {available.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.text3, padding: theme.spacing(3) }]}>
                  No foods available yet.
                </Text>
              ) : (
                available.map((food) => (
                  <Pressable
                    key={food.id}
                    onPress={() => addIngredient(food)}
                    style={[styles.pickerRow, { borderBottomColor: theme.colors.border, padding: theme.spacing(3) }]}
                  >
                    <Text style={[styles.pickerName, { color: theme.colors.text }]}>{food.name}</Text>
                    <Text style={[styles.pickerMeta, { color: theme.colors.text3 }]}>
                      {food.kcalPer100} kcal / 100g
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.spacing(5),
            paddingTop: theme.spacing(3),
            paddingBottom: theme.spacing(6),
          },
        ]}
      >
        <View style={styles.totalsRow}>
          <View>
            <Text style={[styles.totalKcal, { color: theme.colors.text }]}>{total.kcal} kcal</Text>
            <View style={styles.macroRow}>
              <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {total.protein}g</Text>
              <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {total.carb}g</Text>
              <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {total.fat}g</Text>
            </View>
          </View>
          <Pressable
            testID="log-meal-button"
            disabled={validItems.length === 0 || saving}
            onPress={handleLogMeal}
            style={[
              {
                backgroundColor: validItems.length === 0 ? theme.colors.track : theme.colors.accent,
                borderRadius: theme.radius.full,
                paddingHorizontal: theme.spacing(6),
                paddingVertical: theme.spacing(3),
              },
            ]}
          >
            <Text
              style={[
                styles.logButtonText,
                { color: validItems.length === 0 ? theme.colors.text3 : '#ffffff' },
              ]}
            >
              Log meal
            </Text>
          </Pressable>
        </View>
      </View>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  ingredientKcal: {
    fontSize: 13,
    marginTop: 2,
  },
  gramsInput: {
    width: 56,
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  gramsUnit: {
    fontSize: 13,
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  picker: {
    overflow: 'hidden',
  },
  pickerRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerMeta: {
    fontSize: 13,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalKcal: {
    fontSize: 24,
    fontWeight: '700',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  macroText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
