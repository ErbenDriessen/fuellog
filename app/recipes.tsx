import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { Recipe } from '../src/db/repositories/recipesRepository';

export default function RecipesScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { recipes } = useDb();

  const [items, setItems] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      (async () => {
        const all = await recipes.all();
        if (mountedRef.current) {
          setItems(all);
          setLoaded(true);
        }
      })();
      return () => {
        mountedRef.current = false;
      };
    }, [recipes]),
  );

  function openRecipe(recipe: Recipe) {
    router.push({ pathname: '/build-meal', params: { recipeId: recipe.id } });
  }

  return (
    <View testID="screen-recipes" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Saved meals</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: theme.spacing(5), paddingBottom: theme.spacing(10) }}
      >
        {loaded && items.length === 0 && (
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.text3, marginTop: theme.spacing(8), textAlign: 'center' },
            ]}
          >
            No saved meals yet — build a meal and tap Save.
          </Text>
        )}

        {items.map((recipe) => (
          <Pressable
            key={recipe.id}
            testID={`recipe-row-${recipe.id}`}
            onPress={() => openRecipe(recipe)}
            style={[
              styles.recipeRow,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.md,
                padding: theme.spacing(3),
                marginTop: theme.spacing(2),
              },
            ]}
          >
            <Text style={[styles.recipeName, { color: theme.colors.text }]} numberOfLines={1}>
              {recipe.name}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text3} />
          </Pressable>
        ))}
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
  emptyText: {
    fontSize: 15,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
