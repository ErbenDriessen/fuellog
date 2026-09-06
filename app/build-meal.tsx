import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { Food } from '../src/db/repositories/foodsRepository';
import { roundMacros } from '../src/food/macros';
import { buildLogEntries, ingredientMacros, mealTotal, MealIngredient } from '../src/food/meal';
import { buildRecipe } from '../src/food/recipe';
import { todayISO } from '../src/food/date';
import { sanitizeDecimal } from '../src/food/number';
import { groupFoodsByCategory } from '../src/food/foodGroups';
import { Card } from '../src/components/ui/Card';
import { SearchBar } from '../src/components/ui/SearchBar';

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
  const { foods, foodLog, recipes } = useDb();
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();

  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [available, setAvailable] = useState<Food[]>([]);
  const [rows, setRows] = useState<{ food: Food; gramsText: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  // NOTE: this ref-based "run once" guard assumes StrictMode is off (double-invoke would bypass it).
  const prefilledRecipeIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const all = await foods.all();
        if (active) setAvailable(all);
      })();
      return () => {
        active = false;
      };
    }, [foods]),
  );

  // Prefill ingredient rows from a saved recipe (one-tap re-log). Runs at most
  // once per recipeId so later grams edits by the user aren't clobbered by a
  // re-run of this effect (e.g. when `available` updates on refocus).
  useEffect(() => {
    if (!recipeId) return;
    if (available.length === 0) return;
    if (prefilledRecipeIdRef.current === recipeId) return;
    prefilledRecipeIdRef.current = recipeId;

    let active = true;
    (async () => {
      const recipeItems = await recipes.itemsFor(recipeId);
      if (!active) return;
      const newRows: { food: Food; gramsText: string }[] = [];
      for (const item of recipeItems) {
        const food = available.find((f) => f.id === item.foodId);
        if (food) newRows.push({ food, gramsText: String(item.grams) });
      }
      setRows(newRows);
    })();
    return () => {
      active = false;
    };
  }, [recipeId, available, recipes]);

  const items: MealIngredient[] = useMemo(
    () => rows.map((r) => ({ food: r.food, grams: Number(r.gramsText) || 0 })),
    [rows],
  );

  const validItems = useMemo(() => items.filter((i) => i.grams > 0), [items]);

  const total = useMemo(() => roundMacros(mealTotal(items)), [items]);

  function openPicker() {
    setSearch('');
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setSearch('');
  }

  function addIngredient(food: Food) {
    setRows((prev) => [...prev, { food, gramsText: '100' }]);
    closePicker();
  }

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q ? available.filter((f) => f.name.toLowerCase().includes(q)) : available;
    return groupFoodsByCategory(matches);
  }, [available, search]);

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

  function openRecipeModal() {
    if (validItems.length === 0) return;
    setRecipeName('');
    setRecipeError(null);
    setRecipeModalOpen(true);
  }

  function closeRecipeModal() {
    setRecipeModalOpen(false);
    setRecipeName('');
    setRecipeError(null);
  }

  async function handleSaveRecipe() {
    const trimmed = recipeName.trim();
    if (trimmed.length === 0 || savingRecipe) return;
    setSavingRecipe(true);
    setRecipeError(null);
    try {
      const { recipe, items: recipeItems } = buildRecipe(
        recipeName,
        validItems,
        `recipe-${Date.now()}`,
        (i) => `ritem-${Date.now()}-${i}`,
        Date.now(),
      );
      await recipes.save(recipe, recipeItems);
      closeRecipeModal();
    } catch {
      setRecipeError('Could not save recipe. Try again.');
    } finally {
      setSavingRecipe(false);
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
            onPress={openPicker}
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
            <Ionicons name="add" size={18} color={theme.colors.accent} />
            <Text style={[styles.addButtonText, { color: theme.colors.accent }]}>Add ingredient</Text>
          </Pressable>
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
          <View style={styles.actionButtons}>
            <Pressable
              testID="save-recipe-button"
              disabled={validItems.length === 0}
              onPress={openRecipeModal}
              style={[
                styles.saveRecipeButton,
                {
                  borderColor: validItems.length === 0 ? theme.colors.track : theme.colors.accent,
                  borderRadius: theme.radius.full,
                  paddingHorizontal: theme.spacing(4),
                  paddingVertical: theme.spacing(3),
                  marginRight: theme.spacing(2),
                },
              ]}
            >
              <Text
                style={[
                  styles.saveRecipeButtonText,
                  { color: validItems.length === 0 ? theme.colors.text3 : theme.colors.accent },
                ]}
              >
                Save as meal
              </Text>
            </Pressable>
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

      <Modal
        visible={pickerOpen}
        animationType="slide"
        onRequestClose={closePicker}
        presentationStyle="fullScreen"
      >
        <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
          <View
            style={[
              styles.header,
              { paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(3) },
            ]}
          >
            <Pressable
              testID="close-picker-button"
              accessibilityLabel="Close"
              onPress={closePicker}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: theme.colors.surface2 }]}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </Pressable>
            <Text style={[styles.title, { color: theme.colors.text }]}>Add ingredient</Text>
            <View style={styles.closeButton} />
          </View>

          <View style={{ paddingHorizontal: theme.spacing(5) }}>
            <SearchBar
              testID="ingredient-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search foods"
            />

            <View style={[styles.actionRow, { marginTop: theme.spacing(3) }]}>
              <Pressable
                testID="create-food-button"
                onPress={() => router.push('/add-food')}
                style={[styles.actionChip, { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.full }]}
              >
                <Ionicons name="add" size={16} color={theme.colors.accent} />
                <Text style={[styles.actionChipText, { color: theme.colors.accent }]}>New food</Text>
              </Pressable>
              <Pressable
                testID="scan-barcode-button"
                onPress={() => router.push('/scan')}
                style={[styles.actionChip, { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.full }]}
              >
                <Ionicons name="barcode-outline" size={16} color={theme.colors.accent} />
                <Text style={[styles.actionChipText, { color: theme.colors.accent }]}>Scan</Text>
              </Pressable>
              <Pressable
                testID="scan-label-button"
                onPress={() => router.push('/scan-label')}
                style={[styles.actionChip, { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.full }]}
              >
                <Ionicons name="document-text-outline" size={16} color={theme.colors.accent} />
                <Text style={[styles.actionChipText, { color: theme.colors.accent }]}>Label</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingTop: theme.spacing(4), paddingBottom: theme.spacing(10) }}
          >
            {filteredGroups.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.text3, marginTop: theme.spacing(6), textAlign: 'center' }]}>
                {available.length === 0 ? 'No foods yet — add one above.' : 'No foods match your search.'}
              </Text>
            ) : (
              filteredGroups.map((section) => (
                <View key={section.group.id} style={{ marginBottom: theme.spacing(5) }}>
                  <Text style={[styles.groupLabel, { color: theme.colors.text2, marginBottom: theme.spacing(2) }]}>
                    {section.group.label}
                  </Text>
                  {section.foods.map((food) => (
                    <Card
                      key={food.id}
                      testID={`food-card-${food.id}`}
                      onPress={() => addIngredient(food)}
                      style={{ marginBottom: theme.spacing(2), flexDirection: 'row', alignItems: 'center' }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.foodCardName, { color: theme.colors.text }]} numberOfLines={1}>
                          {food.name}
                        </Text>
                        <Text style={[styles.foodCardMeta, { color: theme.colors.text3, marginTop: theme.spacing(1) }]}>
                          {food.kcalPer100} kcal · P {food.proteinPer100} · C {food.carbPer100} · F {food.fatPer100} / 100g
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={theme.colors.accent} />
                    </Card>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={recipeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeRecipeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing(5) },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Save as meal</Text>
            <TextInput
              testID="recipe-name-input"
              value={recipeName}
              onChangeText={setRecipeName}
              placeholder="Recipe name"
              placeholderTextColor={theme.colors.text3}
              style={[
                styles.modalInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface2,
                  borderRadius: theme.radius.sm,
                  marginTop: theme.spacing(3),
                  paddingHorizontal: theme.spacing(3),
                },
              ]}
            />
            {recipeError && (
              <Text style={[styles.modalError, { color: theme.colors.fat, marginTop: theme.spacing(2) }]}>
                {recipeError}
              </Text>
            )}
            <View style={[styles.modalActions, { marginTop: theme.spacing(4) }]}>
              <Pressable
                testID="cancel-save-recipe-button"
                onPress={closeRecipeModal}
                style={[styles.modalCancelButton, { paddingVertical: theme.spacing(3), paddingHorizontal: theme.spacing(4) }]}
              >
                <Text style={[styles.modalCancelText, { color: theme.colors.text2 }]}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="confirm-save-recipe-button"
                disabled={recipeName.trim().length === 0 || savingRecipe}
                onPress={handleSaveRecipe}
                style={[
                  {
                    backgroundColor:
                      recipeName.trim().length === 0 || savingRecipe ? theme.colors.track : theme.colors.accent,
                    borderRadius: theme.radius.full,
                    paddingHorizontal: theme.spacing(5),
                    paddingVertical: theme.spacing(3),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalConfirmText,
                    { color: recipeName.trim().length === 0 || savingRecipe ? theme.colors.text3 : '#ffffff' },
                  ]}
                >
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  foodCardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  foodCardMeta: {
    fontSize: 12,
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveRecipeButton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  saveRecipeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalInput: {
    fontSize: 15,
    paddingVertical: 10,
  },
  modalError: {
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCancelButton: {},
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
