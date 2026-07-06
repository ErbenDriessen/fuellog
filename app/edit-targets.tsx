import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { DailyTarget } from '../src/db/repositories/dailyTargetsRepository';
import { todayISO } from '../src/food/date';
import { sanitizeDecimal } from '../src/food/number';

interface Field {
  key: 'kcal' | 'protein' | 'carb' | 'fat';
  label: string;
  testID: string;
}

const FIELDS: Field[] = [
  { key: 'kcal', label: 'Calories (kcal)', testID: 'target-kcal-input' },
  { key: 'protein', label: 'Protein (g)', testID: 'target-protein-input' },
  { key: 'carb', label: 'Carbs (g)', testID: 'target-carb-input' },
  { key: 'fat', label: 'Fat (g)', testID: 'target-fat-input' },
];

export default function EditTargetsScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { dailyTargets } = useDb();

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
    let active = true;
    (async () => {
      const current = await dailyTargets.current();
      if (active && current) {
        setValues({
          kcal: String(current.kcal),
          protein: String(current.protein),
          carb: String(current.carb),
          fat: String(current.fat),
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [dailyTargets]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function updateField(key: Field['key'], text: string) {
    setValues((prev) => ({ ...prev, [key]: sanitizeDecimal(text) }));
  }

  const parsed = {
    kcal: Number(values.kcal),
    protein: Number(values.protein),
    carb: Number(values.carb),
    fat: Number(values.fat),
  };
  const valid =
    values.kcal !== '' &&
    values.protein !== '' &&
    values.carb !== '' &&
    values.fat !== '' &&
    parsed.kcal > 0 &&
    parsed.protein > 0 &&
    parsed.carb > 0 &&
    parsed.fat > 0;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const target: DailyTarget = {
        id: `target-${todayISO()}`,
        kcal: parsed.kcal,
        protein: parsed.protein,
        carb: parsed.carb,
        fat: parsed.fat,
        effectiveFrom: todayISO(),
      };
      await dailyTargets.setTarget(target);
      router.back();
    } catch {
      if (mountedRef.current) {
        setError('Could not save targets. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  return (
    <View testID="screen-edit-targets" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Edit targets</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
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
            testID="save-targets-error"
            style={[styles.errorText, { color: theme.colors.accent, marginTop: theme.spacing(4) }]}
          >
            {error}
          </Text>
        )}

        <Pressable
          testID="save-targets-button"
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
