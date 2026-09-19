import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RiskBandBadge } from './risk-band';

describe('RiskBandBadge', () => {
  it('explains the band in words, so colour is never the only cue', () => {
    render(<RiskBandBadge band="A" />);
    expect(screen.getByText('Band A, the lowest rate')).toBeInTheDocument();
  });

  it.each([
    ['A', 'Band A, the lowest rate'],
    ['B', 'Band B, the middle rate'],
    ['C', 'Band C, the highest rate'],
  ] as const)('describes band %s', (band, description) => {
    render(<RiskBandBadge band={band} />);
    expect(screen.getByText(description)).toBeInTheDocument();
  });
});
