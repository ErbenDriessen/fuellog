import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { sanitizeDecimal } from '../src/food/number';
import { buildCustomFood, isValidCustomFood } from '../src/food/customFood';

interface Field {
  key: 'kcal' | 'protein' | 'carb' | 'fat';
  label: string;
  testID: string;
}

const FIELDS: Field[] = [
  { key: 'kcal', label: 'Calories (kcal) per 100 g', testID: 'food-kcal-input' },
  { key: 'protein', label: 'Protein (g) per 100 g', testID: 'food-protein-input' },
  { key: 'carb', label: 'Carbs (g) per 100 g', testID: 'food-carb-input' },
  { key: 'fat', label: 'Fat (g) per 100 g', testID: 'food-fat-input' },
];

export default function AddFoodScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { foods } = useDb();

  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<Field['key'], string>>({
    kcal: '',
    protein: '',
    carb: '',
    fat: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function updateField(key: Field['key'], text: string) {
    setValues((prev) => ({ ...prev, [key]: sanitizeDecimal(text) }));
  }

  const input = {
    name,
    kcalPer100: Number(values.kcal || 0),
    proteinPer100: Number(values.protein || 0),
    carbPer100: Number(values.carb || 0),
    fatPer100: Number(values.fat || 0),
  };
  const valid = isValidCustomFood(input);

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const food = buildCustomFood(input, `food-${Date.now()}`, Date.now());
      await foods.add(food);
      router.back();
    } catch {
      if (mountedRef.current) {
        setError('Could not save food. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  return (
    <View testID="screen-add-food" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Create a new food</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        <View style={{ marginTop: theme.spacing(4) }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.text2 }]}>Name</Text>
          <TextInput
            testID="food-name-input"
            value={name}
            onChangeText={setName}
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

        {FIELDS.map((field) => (
          <View key={field.key} style={{ marginTop: theme.spacing(4) }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.text2 }]}>{field.label}</Text>
            <TextInput
              testID={field.testID}
              value={values[field.key]}
              onChangeText={(text) => updateField(field.key, text)}
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
        ))}

        {error && (
          <Text
            testID="save-food-error"
            style={[styles.errorText, { color: theme.colors.accent, marginTop: theme.spacing(4) }]}
          >
            {error}
          </Text>
        )}

        <Pressable
          testID="save-food-button"
          disabled={!valid || saving}
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: !valid || saving ? theme.colors.track : theme.colors.accent,
              borderRadius: theme.radius.full,
              marginTop: theme.spacing(6),
              paddingVertical: theme.spacing(3),
            },
          ]}
        >
          <Text
            style={[
              styles.saveButtonText,
              { color: !valid || saving ? theme.colors.text3 : '#ffffff' },
            ]}
          >
            Save
          </Text>
        </Pressable>
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
