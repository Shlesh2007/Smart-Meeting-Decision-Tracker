import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../components/EmptyState';

describe('EmptyState Component Test', () => {
  it('displays custom title, description and call to action button', () => {
    render(
      <EmptyState
        title="No Meetings Found"
        description="Try adjusting your filters"
        actionText="Create Meeting"
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/No Meetings Found/i)).toBeDefined();
    expect(screen.getByText(/Try adjusting your filters/i)).toBeDefined();
    expect(screen.getByText(/Create Meeting/i)).toBeDefined();
  });
});
