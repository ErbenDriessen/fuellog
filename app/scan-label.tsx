import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { getTheme } from '../src/theme/tokens';
import { recognizeText } from '../src/food/ocr';
import { parseNutritionLabel } from '../src/food/labelParser';

type ScanLabelStatus = 'camera' | 'reading' | 'failed';

export default function ScanLabelScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const [permission, requestPermission] = useCameraPermissions();

  const [status, setStatus] = useState<ScanLabelStatus>('camera');
  const cameraRef = useRef<CameraView>(null);
  const mountedRef = useRef(true);
  // Guards handleCapture against a fast double-tap firing a second capture/OCR pass
  // before the first has finished, mirroring the scanner's isSavingRef pattern.
  const isCapturingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleCapture() {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setStatus('reading');
    try {
      const photo = await cameraRef.current?.takePictureAsync();
      if (!photo) throw new Error('No photo captured');
      const text = await recognizeText(photo.uri);
      const parsed = parseNutritionLabel(text);
      const found =
        parsed.kcalPer100 !== undefined ||
        parsed.proteinPer100 !== undefined ||
        parsed.carbPer100 !== undefined ||
        parsed.fatPer100 !== undefined;

      if (!mountedRef.current) return;

      if (found) {
        router.replace({
          pathname: '/add-food',
          params: {
            kcal: String(parsed.kcalPer100 ?? ''),
            protein: String(parsed.proteinPer100 ?? ''),
            carb: String(parsed.carbPer100 ?? ''),
            fat: String(parsed.fatPer100 ?? ''),
          },
        });
      } else {
        setStatus('failed');
      }
    } catch {
      if (mountedRef.current) {
        setStatus('failed');
      }
    } finally {
      isCapturingRef.current = false;
    }
  }

  function handleRetry() {
    setStatus('camera');
  }

  return (
    <View testID="screen-scan-label" style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      {!permission ? (
        <View style={styles.centered} />
      ) : !permission.granted ? (
        <View style={[styles.centered, { paddingHorizontal: theme.spacing(6) }]}>
          <Text style={[styles.permissionTitle, { color: theme.colors.text, marginBottom: theme.spacing(2) }]}>
            Camera access needed
          </Text>
          <Text style={[styles.permissionBody, { color: theme.colors.text2, marginBottom: theme.spacing(5) }]}>
            {permission.canAskAgain === false
              ? 'Camera access is disabled. Enable it in Settings.'
              : 'FuelLog uses the camera to photograph nutrition labels and read them with on-device OCR.'}
          </Text>
          {permission.canAskAgain === false ? (
            <Pressable
              testID="open-settings-button"
              onPress={() => Linking.openSettings()}
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
              <Text style={styles.primaryButtonText}>Open Settings</Text>
            </Pressable>
          ) : (
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
          )}
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
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />

          <View style={styles.overlay} pointerEvents="box-none">
            <View style={[styles.topBar, { paddingTop: theme.spacing(14), paddingHorizontal: theme.spacing(5) }]}>
              <Pressable
                testID="close-scan-label-button"
                accessibilityLabel="Close"
                onPress={() => router.back()}
                hitSlop={12}
                style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </Pressable>
            </View>

            {status === 'camera' && (
              <View style={styles.frameWrap} pointerEvents="none">
                <View style={[styles.frame, { borderColor: '#ffffff' }]} />
                <Text style={styles.frameHint}>Fill the frame with the nutrition table</Text>
              </View>
            )}

            {status === 'reading' && (
              <View style={styles.frameWrap} pointerEvents="none">
                <Text style={styles.frameHint}>Reading label…</Text>
              </View>
            )}

            {status === 'failed' && (
              <View
                style={[
                  styles.resultCard,
                  { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing(5) },
                ]}
              >
                <Text style={[styles.resultName, { color: theme.colors.text }]}>
                  Couldn't read the label. Try again, fill the frame with the nutrition table, or enter it manually.
                </Text>
                <View style={[styles.resultActions, { marginTop: theme.spacing(4) }]}>
                  <Pressable
                    testID="retry-label-button"
                    onPress={handleRetry}
                    style={[styles.secondaryButton, { borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3) }]}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.colors.text2 }]}>Try again</Text>
                  </Pressable>
                  <Pressable
                    testID="manual-label-button"
                    onPress={() => router.replace('/add-food')}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.colors.accent, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing(5), paddingVertical: theme.spacing(3), marginLeft: theme.spacing(3) },
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Enter manually</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {status === 'camera' && (
              <View style={[styles.bottomBar, { paddingBottom: theme.spacing(10) }]} pointerEvents="box-none">
                <Pressable
                  testID="capture-label-button"
                  onPress={handleCapture}
                  style={[styles.captureButton, { backgroundColor: '#ffffff' }]}
                >
                  <View style={[styles.captureButtonInner, { borderColor: theme.colors.accent }]} />
                </Pressable>
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
    width: 260,
    height: 180,
    borderWidth: 2,
    borderRadius: 16,
  },
  frameHint: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resultCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bottomBar: {
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
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
