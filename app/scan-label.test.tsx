import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockRequestPermission = jest.fn();
const mockRecognizeText = jest.fn();

// Mutable so tests can flip the permission state before rendering.
let mockCurrentPermission: { granted: boolean; canAskAgain?: boolean } | null = { granted: true };

// A valid NL nutrition-label fixture (reused from Task 1's parser tests) so this test exercises
// the REAL parseNutritionLabel rather than a stub.
const VALID_LABEL_TEXT = `
  Voedingswaarde per 100 g
  Energie 1046 kJ / 250 kcal
  Vetten 12,5 g
  waarvan verzadigde vetzuren 2,1 g
  Koolhydraten 30,0 g
  waarvan suikers 5,0 g
  Eiwitten 8,0 g
  Zout 1,2 g
`;

const mockTakePictureAsync = jest.fn(async () => ({ uri: 'file://x' }));

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    replace: (arg: unknown) => mockReplace(arg),
  },
}));

jest.mock('../src/food/ocr', () => ({
  recognizeText: (uri: string) => mockRecognizeText(uri),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: React.forwardRef((_props: unknown, ref: unknown) => {
      if (typeof ref === 'function') {
        ref({ takePictureAsync: mockTakePictureAsync });
      } else if (ref && typeof ref === 'object') {
        (ref as { current: unknown }).current = { takePictureAsync: mockTakePictureAsync };
      }
      return null;
    }),
    useCameraPermissions: () => [mockCurrentPermission, mockRequestPermission],
  };
});

import ScanLabelScreen from './scan-label';

describe('ScanLabelScreen', () => {
  let openSettingsSpy: jest.SpiedFunction<typeof Linking.openSettings>;

  beforeEach(() => {
    mockCurrentPermission = { granted: true };
    mockBack.mockClear();
    mockReplace.mockClear();
    mockRequestPermission.mockClear();
    mockRecognizeText.mockReset();
    mockTakePictureAsync.mockClear();
    openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  });

  afterEach(() => {
    openSettingsSpy.mockRestore();
  });

  it('shows a grant-camera prompt when permission is not granted, and requests it', async () => {
    mockCurrentPermission = { granted: false, canAskAgain: true };
    await render(<ScanLabelScreen />);

    const grantButton = await screen.findByTestId('grant-camera-button');
    await fireEvent.press(grantButton);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('shows an Open Settings button when permission is permanently denied, and opens settings', async () => {
    mockCurrentPermission = { granted: false, canAskAgain: false };
    await render(<ScanLabelScreen />);

    expect(screen.queryByTestId('grant-camera-button')).toBeNull();
    const settingsButton = await screen.findByTestId('open-settings-button');
    await fireEvent.press(settingsButton);

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('captures, OCRs, parses a valid label, and replaces with prefilled add-food params', async () => {
    mockRecognizeText.mockResolvedValueOnce(VALID_LABEL_TEXT);
    await render(<ScanLabelScreen />);

    await fireEvent.press(screen.getByTestId('capture-label-button'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);
    expect(mockRecognizeText).toHaveBeenCalledWith('file://x');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add-food',
      params: {
        kcal: '250',
        protein: '8',
        carb: '30',
        fat: '12.5',
      },
    });
  });

  it('removes the capture button once a capture starts, preventing a second capture (re-entrancy guard)', async () => {
    mockRecognizeText.mockResolvedValueOnce(VALID_LABEL_TEXT);
    await render(<ScanLabelScreen />);

    await fireEvent.press(screen.getByTestId('capture-label-button'));

    // The moment a capture starts, the button is removed from the tree (status -> 'reading'),
    // so there is no target for a second tap — the re-entrancy guard has taken effect.
    expect(screen.queryByTestId('capture-label-button')).toBeNull();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The single capture ran exactly once end to end — no duplicate photo / OCR / navigation.
    expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);
    expect(mockRecognizeText).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('shows a failed UI with retry/manual options when the OCR text has no usable macros', async () => {
    mockRecognizeText.mockResolvedValueOnce('ingredients: water');
    await render(<ScanLabelScreen />);

    await fireEvent.press(screen.getByTestId('capture-label-button'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(await screen.findByTestId('retry-label-button')).toBeTruthy();
    expect(screen.getByTestId('manual-label-button')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('manual-label-button'));
    expect(mockReplace).toHaveBeenCalledWith('/add-food');
  });

  it('resets to the camera view when Try again is pressed after a failed read', async () => {
    mockRecognizeText.mockResolvedValueOnce('ingredients: water');
    await render(<ScanLabelScreen />);

    await fireEvent.press(screen.getByTestId('capture-label-button'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await fireEvent.press(await screen.findByTestId('retry-label-button'));
    expect(await screen.findByTestId('capture-label-button')).toBeTruthy();
  });

  it('shows the failed UI (no crash) when recognizeText rejects', async () => {
    mockRecognizeText.mockRejectedValueOnce(new Error('ocr failed'));
    await render(<ScanLabelScreen />);

    await fireEvent.press(screen.getByTestId('capture-label-button'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByTestId('retry-label-button')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('closes back to the previous screen', async () => {
    await render(<ScanLabelScreen />);

    await fireEvent.press(screen.getByTestId('close-scan-label-button'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
