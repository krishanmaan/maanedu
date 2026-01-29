'use client';

import { useState } from 'react';

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: unknown;
}

export default function MuxDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Environment Variables
    addResult({ step: 'Environment Check', status: 'pending', message: 'Checking environment variables...' });

    try {
      const envResponse = await fetch('/api/mux/test');
      const envData = await envResponse.json();

      if (envData.success) {
        addResult({
          step: 'Environment Check',
          status: 'success',
          message: 'Environment variables configured correctly',
          details: envData.details,
        });
      } else {
        addResult({
          step: 'Environment Check',
          status: 'error',
          message: envData.error,
          details: envData.details,
        });
        setIsRunning(false);
        return;
      }
    } catch (error) {
      addResult({
        step: 'Environment Check',
        status: 'error',
        message: 'Failed to test environment',
        details: error,
      });
      setIsRunning(false);
      return;
    }

    // Test 2: Upload URL Creation
    addResult({ step: 'Upload URL', status: 'pending', message: 'Creating upload URL...' });

    try {
      const uploadResponse = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        addResult({
          step: 'Upload URL',
          status: 'success',
          message: 'Upload URL created successfully',
          details: { uploadId: uploadData.upload_id },
        });
      } else {
        addResult({
          step: 'Upload URL',
          status: 'error',
          message: uploadData.error,
          details: uploadData.details,
        });
      }
    } catch (error) {
      addResult({
        step: 'Upload URL',
        status: 'error',
        message: 'Failed to create upload URL',
        details: error,
      });
    }

    setIsRunning(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Mux Integration Diagnostics</h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {result.status === 'pending' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
                {result.status === 'success' && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {result.status === 'error' && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{result.step}</span>
                  <span
                    className={`text-sm ${
                      result.status === 'success'
                        ? 'text-green-600'
                        : result.status === 'error'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {result.status === 'pending' ? 'Running...' : result.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                {!!result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Show details</summary>
                    <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !isRunning && (
        <p className="text-gray-500 text-center py-8">Click &quot;Run Diagnostics&quot; to test your Mux integration</p>
      )}
    </div>
  );
}
