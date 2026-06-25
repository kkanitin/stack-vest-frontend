import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortfolioCard from './PortfolioCard';
import type { Portfolio } from '../api/portfolios';

function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: 'p1',
    name: 'Institutional Growth',
    description: 'High-conviction ETFs and blue-chip equities.',
    createdAt: '2026-06-25T10:30:00Z',
    updatedAt: '2026-06-25T10:30:00Z',
    value: 142500,
    assetCount: 7,
    ...overrides,
  };
}

function renderCard(
  portfolio: Portfolio,
  handlers?: { onEdit?: () => void; onDelete?: () => void; onAnalyze?: () => void }
) {
  return render(
    <MemoryRouter>
      <PortfolioCard
        portfolio={portfolio}
        onEdit={handlers?.onEdit ?? (() => {})}
        onDelete={handlers?.onDelete ?? (() => {})}
        onAnalyze={handlers?.onAnalyze ?? (() => {})}
      />
    </MemoryRouter>
  );
}

describe('PortfolioCard', () => {
  it('renders name, description, padded asset count and formatted value', () => {
    renderCard(makePortfolio());

    expect(screen.getByText('Institutional Growth')).toBeInTheDocument();
    expect(screen.getByText('High-conviction ETFs and blue-chip equities.')).toBeInTheDocument();
    expect(screen.getByText('07 Assets')).toBeInTheDocument();
    expect(screen.getByText('$142,500.00')).toBeInTheDocument();
  });

  it('links to the portfolio detail route', () => {
    renderCard(makePortfolio({ id: 'abc' }));
    const link = screen.getByRole('link', { name: /Institutional Growth/i });
    expect(link).toHaveAttribute('href', '/dashboard/portfolios/abc');
  });

  it('shows a dash when value/assetCount are missing', () => {
    renderCard(makePortfolio({ value: undefined, assetCount: undefined }));
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('fires onEdit and onDelete from the actions menu', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderCard(makePortfolio(), { onEdit, onDelete });

    fireEvent.click(screen.getByRole('button', { name: /Actions for Institutional Growth/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Actions for Institutional Growth/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('fires onAnalyze from the actions menu', () => {
    const onAnalyze = vi.fn();
    renderCard(makePortfolio(), { onAnalyze });

    fireEvent.click(screen.getByRole('button', { name: /Actions for Institutional Growth/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Analyze' }));
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });
});
