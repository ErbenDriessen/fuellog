import { render, fireEvent, screen, act } from '@testing-library/react-native';

import { Food } from '../src/db/repositories/foodsRepository';

const testFood: Food = {
  id: 'off-123456',
  name: 'Test Snack',
  barcode: '123456',
  kcalPer100: 250,
  proteinPer100: 10,
  carbPer100: 30,
  fatPer100: 8,
  source: 'off',
  createdAt: 0,
};

// Mutable so individual tests can simulate foods already present in the DB.
let existingFoods: Food[] = [];
const mockFoodsAdd = jest.fn(async (_f: Food) => {});
const mockFoodsAll = jest.fn(async () => existingFoods);

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRequestPermission = jest.fn();

// Mutable so tests can flip the permission state before rendering.
let mockCurrentPermission: { granted: boolean } | null = { granted: true };

// Captures the CameraView's onBarcodeScanned handler so tests can invoke it
// directly, simulating a real scan without a real camera.
let mockLatestOnBarcodeScanned: ((e: { data: string }) => void) | null = null;

const mockFetchProductByBarcode = jest.fn();

jest.mock('../src/db/DatabaseProvider', () => ({
  useDb: () => ({
    foods: { all: mockFoodsAll, add: mockFoodsAdd },
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    push: (path: string) => mockPush(path),
  },
}));

jest.mock('../src/food/openFoodFacts', () => ({
  fetchProductByBarcode: (barcode: string) => mockFetchProductByBarcode(barcode),
}));

jest.mock('expo-camera', () => ({
  CameraView: (props: { onBarcodeScanned?: (e: { data: string }) => void }) => {
    mockLatestOnBarcodeScanned = props.onBarcodeScanned ?? null;
    return null;
  },
  useCameraPermissions: () => [mockCurrentPermission, mockRequestPermission],
}));

import ScanScreen from './scan';

describe('ScanScreen', () => {
  beforeEach(() => {
    existingFoods = [];
    mockCurrentPermission = { granted: true };
    mockLatestOnBarcodeScanned = null;
    mockFoodsAdd.mockClear();
    mockFoodsAll.mockClear();
    mockBack.mockClear();
    mockPush.mockClear();
    mockRequestPermission.mockClear();
    mockFetchProductByBarcode.mockReset();
  });

  it('shows a grant-camera prompt when permission is not granted, and requests it', async () => {
    mockCurrentPermission = { granted: false };
    await render(<ScanScreen />);

    const grantButton = await screen.findByTestId('grant-camera-button');
    await fireEvent.press(grantButton);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('looks up a scanned barcode, shows the found product, and adds it on confirm', async () => {
    mockFetchProductByBarcode.mockResolvedValueOnce(testFood);
    await render(<ScanScreen />);

    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '123456' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('Test Snack')).toBeTruthy();
    expect(mockFetchProductByBarcode).toHaveBeenCalledWith('123456');

    await fireEvent.press(screen.getByTestId('add-scanned-food-button'));

    expect(mockFoodsAdd).toHaveBeenCalledWith(testFood);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows a not-found message and routes to manual add', async () => {
    mockFetchProductByBarcode.mockResolvedValueOnce(null);
    await render(<ScanScreen />);

    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '000000' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('No product found for 000000')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('manual-add-button'));
    expect(mockPush).toHaveBeenCalledWith('/add-food');
  });

  it('shows an error message on network failure and retries the same barcode', async () => {
    mockFetchProductByBarcode.mockRejectedValueOnce(new Error('network down'));
    await render(<ScanScreen />);

    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '999999' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByTestId('retry-scan-button')).toBeTruthy();
    expect(mockFetchProductByBarcode).toHaveBeenCalledTimes(1);

    mockFetchProductByBarcode.mockResolvedValueOnce(testFood);
    await fireEvent.press(screen.getByTestId('retry-scan-button'));

    expect(await screen.findByText('Test Snack')).toBeTruthy();
    expect(mockFetchProductByBarcode).toHaveBeenCalledTimes(2);
    expect(mockFetchProductByBarcode).toHaveBeenLastCalledWith('999999');
  });

  it('does not re-add a food that already exists (dedup by id) but still navigates back', async () => {
    existingFoods = [testFood];
    mockFetchProductByBarcode.mockResolvedValueOnce(testFood);
    await render(<ScanScreen />);

    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '123456' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('Test Snack')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('add-scanned-food-button'));

    expect(mockFoodsAdd).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('processes only one barcode until reset, ignoring rapid repeat scans from the camera', async () => {
    let resolveFetch: (food: Food | null) => void = () => {};
    mockFetchProductByBarcode.mockImplementationOnce(
      () =>
        new Promise<Food | null>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    await render(<ScanScreen />);

    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '123456' });
      mockLatestOnBarcodeScanned?.({ data: '123456' });
      mockLatestOnBarcodeScanned?.({ data: '123456' });
      await Promise.resolve();
    });

    expect(mockFetchProductByBarcode).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(testFood);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('Test Snack')).toBeTruthy();
  });

  it('resets the single-scan guard on Scan again, allowing a new barcode to be processed', async () => {
    mockFetchProductByBarcode.mockResolvedValueOnce(null);
    await render(<ScanScreen />);

    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '111111' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByTestId('scan-again-button')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('scan-again-button'));

    mockFetchProductByBarcode.mockResolvedValueOnce(testFood);
    await act(async () => {
      mockLatestOnBarcodeScanned?.({ data: '222222' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('Test Snack')).toBeTruthy();
    expect(mockFetchProductByBarcode).toHaveBeenCalledTimes(2);
    expect(mockFetchProductByBarcode).toHaveBeenLastCalledWith('222222');
  });
});
