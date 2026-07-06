import { render } from '@testing-library/react-native';

import Food from '../index';
import Gym from '../gym';
import Progress from '../progress';

describe('tab screens', () => {
  it('renders each screen root', async () => {
    // @testing-library/react-native 14.x's `render` is async (backed by the
    // `test-renderer` package), unlike earlier synchronous versions.
    expect((await render(<Food />)).getByTestId('screen-food')).toBeTruthy();
    expect((await render(<Gym />)).getByTestId('screen-gym')).toBeTruthy();
    expect((await render(<Progress />)).getByTestId('screen-progress')).toBeTruthy();
  });
});
