import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Ring } from './Ring';

describe('Ring', () => {
  it('renders the ring root and centers children', async () => {
    await render(
      <Ring size={100} stroke={10} pct={0.5} color="#f00" trackColor="#eee" testID="ring">
        <Text>x</Text>
      </Ring>,
    );

    expect(screen.getByTestId('ring')).toBeTruthy();
    expect(screen.getByText('x')).toBeTruthy();
  });

  it('sets strokeDashoffset to circumference * (1 - pct) for the progress circle', async () => {
    const size = 100;
    const stroke = 10;
    const pct = 0.25;

    await render(<Ring size={size} stroke={stroke} pct={pct} color="#f00" trackColor="#eee" testID="ring" />);

    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const expectedOffset = circumference * (1 - pct);

    const progress = screen.getByTestId('ring-progress');
    expect(progress.props.strokeDashoffset).toBe(expectedOffset);
  });
});
