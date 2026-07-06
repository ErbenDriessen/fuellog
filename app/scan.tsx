import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useDb } from '../src/db/DatabaseProvider';
import { getTheme } from '../src/theme/tokens';
import { Food } from '../src/db/repositories/foodsRepository';
import { fetchProductByBarcode } from '../src/food/openFoodFacts';

type ScanStatus = 'scanning' | 'looking-up' | 'found' | 'not-found' | 'error';

export default function ScanScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { foods } = useDb();
  const [permission, requestPermission] = useCameraPermissions();

  const [status, setStatus] = useState<ScanStatus>('scanning');
  const [barcode, setBarcode] = useState<string | null>(null);
  const [food, setFood] = useState<Food | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Guards the rapid-repeat scans CameraView fires for the same barcode while a
  // lookup is in flight / a result is on screen. Reset only by scan-again/retry.
  const scannedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function runLookup(code: string) {
    setStatus('looking-up');
    try {
      const result = await fetchProductByBarcode(code);
      if (!mountedRef.current) return;
      if (result) {
        setFood(result);
        setStatus('found');
      } else {
        setFood(null);
        setStatus('not-found');
      }
    } catch {
      if (!mountedRef.current) return;
      setFood(null);
      setStatus('error');
    }
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setBarcode(data);
    setAddError(null);
    void runLookup(data);
  }

  function handleRetry() {
    if (!barcode) return;
    void runLookup(barcode);
  }

  function handleScanAgain() {
    scannedRef.current = false;
    setBarcode(null);
    setFood(null);
    setAddError(null);
    setStatus('scanning');
  }

  async function handleAdd() {
    if (!food) return;
    setAddError(null);
    try {
      const existing = await foods.all();
      const alreadySaved = existing.some((f) => f.id === food.id);
      if (!alreadySaved) {
        await foods.add(food);
      }
      router.back();
    } catch {
      if (mountedRef.current) {
        setAddError('Could not save this food. Please try again.');
      }
    }
  }

  return (
    <View testID="screen-scan" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      {!permission ? (
        <View style={styles.centered} />
      ) : !permission.granted ? (
        <View style={[styles.centered, { paddingHorizontal: theme.spacing(6) }]}>
          <Text style={[styles.permissionTitle, { color: theme.colors.text, marginBottom: theme.spacing(2) }]}>
            Camera access needed
          </Text>
          <Text style={[styles.permissionBody, { color: theme.colors.text2, marginBottom: theme.spacing(5) }]}>
            FuelLog uses the camera to scan product barcodes and look them up on Open Food Facts.
          </Text>
          <Pressable
            testID="grant-camera-button"
            onPress={() => requestPermission()}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.colors.accent,
                borderRadius: theme.radius.full,
                paddingHorizontal: theme.spacing(6),
                paddingVertical: theme.spacing(3),
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>Allow camera access</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{ marginTop: theme.spacing(4) }}
          >
            <Text style={[styles.cancelText, { color: theme.colors.text2 }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View style={styles.overlay} pointerEvents="box-none">
            <View style={[styles.topBar, { paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5) }]}>
              <Pressable
                testID="close-scan-button"
                accessibilityLabel="Close"
                onPress={() => router.back()}
                hitSlop={12}
                style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </Pressable>
            </View>

            {status === 'scanning' && (
              <View style={styles.frameWrap} pointerEvents="none">
                <View style={[styles.frame, { borderColor: '#ffffff' }]} />
                <Text style={styles.frameHint}>Line up the barcode inside the frame</Text>
              </View>
            )}

            {status === 'looking-up' && (
              <View style={styles.frameWrap} pointerEvents="none">
                <Text style={styles.frameHint}>Looking up product…</Text>
              </View>
            )}

            {status === 'found' && food && (
              <View
                style={[
                  styles.resultCard,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(5) },
                ]}
              >
                <Text style={[styles.resultName, { color: theme.colors.text }]} numberOfLines={2}>
                  {food.name}
                </Text>
                <Text style={[styles.resultKcal, { color: theme.colors.text2, marginTop: theme.spacing(1) }]}>
                  {food.kcalPer100} kcal / 100g
                </Text>
                <View style={[styles.macroRow, { marginTop: theme.spacing(2) }]}>
                  <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {food.proteinPer100}g</Text>
                  <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {food.carbPer100}g</Text>
                  <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {food.fatPer100}g</Text>
                </View>

                {addError && (
                  <Text style={[styles.errorText, { color: theme.colors.accent, marginTop: theme.spacing(3) }]}>
                    {addError}
                  </Text>
                )}

                <View style={[styles.resultActions, { marginTop: theme.spacing(4) }]}>
                  <Pressable
                    testID="scan-again-button"
                    onPress={handleScanAgain}
                    style={[styles.secondaryButton, { borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3) }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text2 }]}>Scan again</Text>
                  </Pressable>
                  <Pressable
                    testID="add-scanned-food-button"
                    onPress={handleAdd}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(6), paddingVertical: theme.spacing(3), marginLeft: theme.spacing(3) },
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {status === 'not-found' && (
              <View
                style={[
                  styles.resultCard,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(5) },
                ]}
              >
                <Text style={[styles.resultName, { color: theme.colors.text }]}>
                  No product found for {barcode}
                </Text>
                <View style={[styles.resultActions, { marginTop: theme.spacing(4) }]}>
                  <Pressable
                    testID="scan-again-button"
                    onPress={handleScanAgain}
                    style={[styles.secondaryButton, { borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3) }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text2 }]}>Scan again</Text>
                  </Pressable>
                  <Pressable
                    testID="manual-add-button"
                    onPress={() => router.push('/add-food')}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3), marginLeft: theme.spacing(3) },
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Enter it manually</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {status === 'error' && (
              <View
                style={[
                  styles.resultCard,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(5) },
                ]}
              >
                <Text style={[styles.resultName, { color: theme.colors.text }]}>
                  Couldn't reach Open Food Facts. Check your connection.
                </Text>
                <View style={[styles.resultActions, { marginTop: theme.spacing(4) }]}>
                  <Pressable
                    testID="scan-again-button"
                    onPress={handleScanAgain}
                    style={[styles.secondaryButton, { borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3) }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text2 }]}>Scan again</Text>
                  </Pressable>
                  <Pressable
                    testID="retry-scan-button"
                    onPress={handleRetry}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3), marginLeft: theme.spacing(3) },
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Retry</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 14,
    textAlign: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 140,
    borderWidth: 2,
    borderRadius: 16,
  },
  frameHint: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  resultName: {
    fontSize: 17,
    fontWeight: '700',
  },
  resultKcal: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
