import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders the dashboard with a free plan', () => {
    render(
      <DashboardPage
        onNavigate={() => {}}
        subscription={{ plan: 'free' } as any}
        onUpgrade={() => {}}
        onManageSubscription={() => {}}
        translations={{
          list: 'List',
          history: 'History',
          family: 'Family',
          priceCompare: 'Price Compare',
          insights: 'Insights',
          daily: 'Daily',
          voice: 'Voice',
          importExport: 'Import/Export',
          suggestions: 'Suggestions',
        }}
      />
    );

    expect(screen.getByText('Unlock Premium Features')).toBeInTheDocument();
  });

  it('renders the dashboard with a pro plan', () => {
    render(
      <DashboardPage
        onNavigate={() => {}}
        subscription={{ plan: 'pro' } as any}
        onUpgrade={() => {}}
        onManageSubscription={() => {}}
        translations={{
          list: 'List',
          history: 'History',
          family: 'Family',
          priceCompare: 'Price Compare',
          insights: 'Insights',
          daily: 'Daily',
          voice: 'Voice',
          importExport: 'Import/Export',
          suggestions: 'Suggestions',
        }}
      />
    );

    debugger;
    expect(screen.queryByTestId('upgrade-banner')).toBeNull();
  });
});
