import { loadConnectors } from '../src';

describe('loadConnectors', () => {
  it('loads all provider maps', () => {
    const conns = loadConnectors();
    expect(conns).toHaveProperty('github');
    expect(conns).toHaveProperty('facebook');
  });
});
