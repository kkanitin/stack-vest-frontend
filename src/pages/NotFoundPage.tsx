import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="nfp-root">
      <svg
        className="nfp-icon"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <p className="nfp-code">404</p>
      <h1 className="nfp-title headline-sm">Page not found</h1>
      <p className="nfp-desc body-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="nfp-actions">
        <Button onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
