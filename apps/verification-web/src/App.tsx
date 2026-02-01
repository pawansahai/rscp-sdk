import { useState, useEffect } from 'react';
import {
  verifyCertificate,
  formatVerificationCode,
  getLevelDisplayName,
  getLevelColor,
  daysUntilExpiry,
  type VerificationResult,
} from './rscp-utils';

function App() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCert, setManualCert] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const cert = params.get('cert');
    const code = params.get('code');
    const qrData = params.get('data'); // Optional: full QR data JSON

    if (cert && code) {
      const verificationResult = verifyCertificate(cert, code, qrData || undefined);
      setResult(verificationResult);
      setManualCert(cert);
      setManualCode(code);
    } else {
      setShowManualForm(true);
    }

    setLoading(false);
  }, []);

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCert && manualCode) {
      const verificationResult = verifyCertificate(manualCert, manualCode);
      setResult(verificationResult);
      setShowManualForm(false);

      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set('cert', manualCert);
      url.searchParams.set('code', manualCode);
      window.history.pushState({}, '', url);
    }
  };

  const handleReset = () => {
    setResult(null);
    setManualCert('');
    setManualCode('');
    setShowManualForm(true);
    window.history.pushState({}, '', window.location.pathname);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4">
            <span className="text-2xl font-bold text-yellow-900">RS</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            RSCP Certificate Verification
          </h1>
          <p className="text-gray-400 text-sm">
            Road Safety Certification Protocol
          </p>
        </div>

        {/* Manual Entry Form */}
        {showManualForm && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Enter Certificate Details
            </h2>
            <form onSubmit={handleManualVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={manualCert}
                  onChange={(e) => setManualCert(e.target.value.toUpperCase())}
                  placeholder="RS-2026-G-IN-ATV-000001-4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-1234"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-yellow-900 font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
              >
                Verify Certificate
              </button>
            </form>
          </div>
        )}

        {/* Verification Result */}
        {result && (
          <div className="card overflow-hidden">
            {/* Status Header */}
            <div
              className={`p-6 text-center ${
                result.valid
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}
            >
              <div className="text-6xl mb-3">
                {result.valid ? '✓' : '✗'}
              </div>
              <h2 className="text-2xl font-bold text-white">
                {result.valid ? 'CERTIFICATE VERIFIED' : 'VERIFICATION FAILED'}
              </h2>
              {result.valid && result.qrData?.name && (
                <p className="text-white/90 mt-2 text-lg">
                  {result.qrData.name}
                </p>
              )}
            </div>

            {/* Certificate Details */}
            {result.valid && result.parsed && (
              <div className="p-6 space-y-6">
                {/* Level Badge */}
                {(result.qrData?.level || result.parsed.level) && (
                  <div className="flex justify-center">
                    <span
                      className={`px-6 py-2 rounded-full font-bold text-lg bg-gradient-to-r ${
                        getLevelColor(result.qrData?.level || result.parsed.level).gradient
                      } ${getLevelColor(result.qrData?.level || result.parsed.level).text}`}
                    >
                      {getLevelDisplayName(result.qrData?.level || result.parsed.level).toUpperCase()} LEVEL
                    </span>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid gap-4">
                  <DetailRow
                    label="Certificate Number"
                    value={result.parsed.full}
                    mono
                  />
                  <DetailRow
                    label="Verification Code"
                    value={formatVerificationCode(manualCode)}
                    mono
                  />
                  <DetailRow
                    label="Issuer"
                    value={`${result.parsed.issuerCode} (${result.parsed.country})`}
                  />
                  <DetailRow
                    label="Year Issued"
                    value={result.parsed.year.toString()}
                  />
                  {result.qrData?.validUntil && (
                    <DetailRow
                      label="Valid Until"
                      value={formatDate(result.qrData.validUntil)}
                      extra={
                        <span className="text-sm text-gray-500">
                          ({daysUntilExpiry(result.qrData.validUntil)} days remaining)
                        </span>
                      }
                    />
                  )}
                </div>

                {/* Validation Checks */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    Validation Checks
                  </h3>
                  <div className="space-y-2">
                    <CheckItem
                      label="Certificate number format"
                      valid={result.certificateValid}
                    />
                    <CheckItem
                      label="Verification code format"
                      valid={result.codeValid}
                    />
                    <CheckItem
                      label="Not expired"
                      valid={!result.expired}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {!result.valid && result.errors.length > 0 && (
              <div className="p-6">
                <h3 className="text-sm font-medium text-red-600 mb-3">
                  Verification Errors
                </h3>
                <ul className="space-y-2">
                  {result.errors.map((error, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-red-500">•</span>
                      {error}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> If you believe this certificate is valid,
                    please contact the issuing organization directly.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 bg-gray-50 border-t">
              <button
                onClick={handleReset}
                className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Verify Another Certificate
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Powered by{' '}
            <a
              href="https://github.com/rscp-protocol/rscp-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 hover:underline"
            >
              RSCP Protocol
            </a>
          </p>
          <p className="mt-1 text-xs">
            Zero-trust, privacy-preserving road safety certification
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function DetailRow({
  label,
  value,
  mono,
  extra,
}: {
  label: string;
  value: string;
  mono?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <div className="text-right">
        <span className={`text-gray-900 font-medium ${mono ? 'font-mono text-sm' : ''}`}>
          {value}
        </span>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}

function CheckItem({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
          valid
            ? 'bg-green-100 text-green-600'
            : 'bg-red-100 text-red-600'
        }`}
      >
        {valid ? '✓' : '✗'}
      </span>
      <span className="text-gray-700 text-sm">{label}</span>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default App;
