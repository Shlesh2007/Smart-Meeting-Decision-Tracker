import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge Component Tests', () => {
  it('renders OVERDUE tag when type is overdue and value is true', () => {
    render(<StatusBadge type="overdue" value={true} />);
    expect(screen.getByText(/OVERDUE/i)).toBeDefined();
  });

  it('renders Scheduled tag for meeting status', () => {
    render(<StatusBadge type="meetingStatus" value="SCHEDULED" />);
    expect(screen.getByText(/Scheduled/i)).toBeDefined();
  });

  it('renders Critical priority badge', () => {
    render(<StatusBadge type="priority" value="CRITICAL" />);
    expect(screen.getByText(/Critical/i)).toBeDefined();
  });
});
