import TextRecognition from '@react-native-ml-kit/text-recognition';

// Thin wrapper around the on-device ML Kit text-recognition native module, so the OCR engine
// can be swapped (or mocked in tests) without touching the capture UI. Do NOT unit-test this
// file directly — it is native-backed; the screen test mocks this module instead.
export async function recognizeText(uri: string): Promise<string> {
  const result = await TextRecognition.recognize(uri);
  return result?.text ?? '';
}
