"use client";

import { notifySuccess, notifyError, notifyWarning } from "@/lib/api/client";

export default function TestNotificationsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2">
          3D Toast Notifications Test
        </h1>
        <p className="text-slate-400 mb-8">
          Click the buttons below to test the holographic toast notifications with 3D effects.
        </p>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => notifySuccess("Success! Operation completed successfully.")}
            className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium"
          >
            Show Success Toast
          </button>

          <button
            type="button"
            onClick={() => notifyError("Error! Something went wrong.")}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
          >
            Show Error Toast
          </button>

          <button
            type="button"
            onClick={() => notifyWarning("Warning! Please check your input.")}
            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors font-medium"
          >
            Show Warning Toast
          </button>

          <button
            type="button"
            onClick={() => {
              notifySuccess("First notification");
              setTimeout(() => notifyError("Second notification"), 500);
              setTimeout(() => notifyWarning("Third notification"), 1000);
            }}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium"
          >
            Show Multiple Toasts
          </button>
        </div>

        <div className="mt-8 p-4 bg-slate-900/50 rounded-lg">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">Expected Effects:</h2>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>✨ <strong>Success:</strong> Cyan floating particles drifting upward</li>
            <li>🔴 <strong>Error:</strong> Red pulsing glow effect</li>
            <li>⚠️ <strong>Warning:</strong> Amber shimmer on edges</li>
          </ul>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center">
          Effects are subtle and non-intrusive. Open DevTools to check performance.
        </p>
      </div>
    </div>
  );
}
