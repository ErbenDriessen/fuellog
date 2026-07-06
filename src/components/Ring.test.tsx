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
});
