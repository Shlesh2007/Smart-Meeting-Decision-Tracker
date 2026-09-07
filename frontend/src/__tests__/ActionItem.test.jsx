import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('Action Item Status & Priority Badge Test', () => {
  it('renders Correct Decision Made Tag', () => {
    render(<StatusBadge type="decisionStatus" value="DECISION_MADE" />);
    expect(screen.getByText(/Decision Made/i)).toBeDefined();
  });

  it('renders Action Status Blocked tag correctly', () => {
    render(<StatusBadge type="actionStatus" value="BLOCKED" />);
    expect(screen.getByText(/Blocked/i)).toBeDefined();
  });
});
