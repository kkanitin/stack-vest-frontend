import { render, screen, fireEvent } from '@testing-library/react';
import AssetDetailModal from './AssetDetailModal';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useStockHistory } from '../hooks/useStockHistory';
import type { CompanyProfile } from '../api/stocks';

vi.mock('../hooks/useCompanyProfile', () => ({ useCompanyProfile: vi.fn() }));
vi.mock('../hooks/useStockHistory', () => ({ useStockHistory: vi.fn() }));

const mockedProfile = vi.mocked(useCompanyProfile);
const mockedHistory = vi.mocked(useStockHistory);

const LONG_DESC =
  "Alphabet Inc. operates globally, providing a wide array of products and digital " +
  "platforms to customers across the United States, Europe, the Middle East, Africa, the " +
  "Asia-Pacific region, Canada, and Latin America. The company's business is organized into " +
  "three primary segments: Google Services, Google Cloud, and Other Bets. The Google Services " +
  "division delivers a broad spectrum of consumer-facing offerings, which include its " +
  "advertising products, the Android operating system, Chrome browser, various hardware " +
  "devices, Gmail, Google Drive, Google Maps, Google Photos, Google Play, Search functionality, " +
  "and YouTube. This segment also generates revenue through the sale of applications, in-app " +
  "purchases, and digital content via Google Play and YouTube, alongside device sales and " +
  "consumer subscriptions for YouTube services. Conversely, the Google Cloud segment furnishes " +
  "enterprise-grade solutions such as infrastructure, cybersecurity, database management, " +
  "analytics, artificial intelligence, and other professional services. This encompasses the " +
  "Google Workspace suite, a collection of cloud-native communication and collaboration tools " +
  "for businesses, including Gmail, Docs, Drive, Calendar, and Meet, among other offerings " +
  "tailored for corporate clients. The Other Bets segment is dedicated to developing nascent " +
  "ventures, particularly those focused on healthcare-related and internet services. " +
  "Established in 1998, Alphabet Inc. maintains its corporate headquarters in Mountain View, " +
  "California.";

function profile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    symbol: 'GOOG',
    companyName: 'Alphabet Inc.',
    currency: 'USD',
    exchange: 'NASDAQ',
    exchangeFullName: 'NASDAQ Global Select',
    industry: '',
    sector: '',
    country: '',
    ceo: '',
    website: '',
    description: '',
    image: '',
    price: 0,
    marketCap: 0,
    beta: 0,
    ipoDate: '',
    fullTimeEmployees: '',
    isEtf: false,
    isActivelyTrading: true,
    ...overrides,
  };
}

/** jsdom does no layout, so fake the clamped/full heights the toggle keys off. */
function stubHeights(scrollHeight: number, clientHeight: number): () => void {
  const prevScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
  const prevClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => clientHeight });
  return () => {
    if (prevScroll) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', prevScroll);
    if (prevClient) Object.defineProperty(HTMLElement.prototype, 'clientHeight', prevClient);
  };
}

describe('AssetDetailModal description', () => {
  beforeEach(() => {
    mockedProfile.mockReset();
    mockedHistory.mockReset();
    mockedHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('offers a "View more" toggle for a long description and expands/collapses it', () => {
    const restore = stubHeights(500, 100); // full text taller than the 5-line clamp
    mockedProfile.mockReturnValue({
      data: profile({ description: LONG_DESC }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AssetDetailModal symbol="GOOG" onClose={() => {}} />);

    // The full text is in the DOM (CSS clamps it visually).
    expect(screen.getByText(/Mountain View, California/)).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /view more/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    const collapse = screen.getByRole('button', { name: /view less/i });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(collapse);
    expect(screen.getByRole('button', { name: /view more/i })).toHaveAttribute('aria-expanded', 'false');

    restore();
  });

  it('does not show the toggle when the description fits within the clamp', () => {
    const restore = stubHeights(100, 100); // no overflow
    mockedProfile.mockReturnValue({
      data: profile({ description: 'A short company description.' }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<AssetDetailModal symbol="GOOG" onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: /view more/i })).not.toBeInTheDocument();

    restore();
  });
});
