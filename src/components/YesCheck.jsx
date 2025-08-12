import { useEffect, useRef, useState } from "react";

/**
 * YesCheck Component
 * - Disguised as speech recognition but actually just checks microphone availability
 * - onPass: callback when microphone is confirmed available
 */
export default function YesCheck({
  onPass,
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);

  const [error, setError] = useState("");
  const stopTimerRef = useRef(null);
  const passedRef = useRef(false); // Track if we've already passed to prevent double calls

  // Direct callback functions
  const callOnPass = () => {
    console.log('YesCheck - callOnPass called, passedRef.current:', passedRef.current);
    if (passedRef.current) {
      console.log('YesCheck - Already passed, ignoring duplicate call');
      return; // Prevent double calls
    }
    passedRef.current = true;
    console.log('YesCheck - Calling onPass callback');
    if (onPass) {
      onPass();
    } else {
      console.warn('YesCheck - onPass callback is not defined!');
    }
  };

  useEffect(() => {
    // Reset passed state when component re-initializes
    passedRef.current = false;
    
    // Check if we're on HTTPS or localhost (required for microphone access)
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      setSupported(false);
      setError("Microphone access requires HTTPS or localhost");
      return;
    }

    return () => {
      // Clean up timeout only since we're not doing real speech recognition
      clearTimeout(stopTimerRef.current);
    };
  }, []);

  const startListening = async () => {
    console.log('YesCheck - Starting mic availability check...');
    setError("");
    passedRef.current = false; // Reset passed state

    // Check if microphone is available by requesting permission
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('YesCheck - Microphone is available! Passing immediately...');
        
        // If we get here, mic is available - pass immediately
        setListening(true);
        
        // Simulate a brief "listening" period for disguise
        setTimeout(() => {
          console.log('YesCheck - Disguise complete, calling onPass');
          setListening(false);
          callOnPass();
        }, 1000); // 1 second delay to maintain the disguise
        
        return; // Don't start actual speech recognition
      }
    } catch (permissionError) {
      console.error('YesCheck - Microphone not available:', permissionError);
      setError("Microphone not available. Please check your microphone and try again.");
      return;
    }
  };

  const stopListening = () => {
    console.log('YesCheck - Manually stopping disguise...');
    setListening(false);
    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
  };

  if (!supported) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Browser Not Supported</h2>
          <p className="text-gray-600 mb-4">
            Your browser doesn't support Speech Recognition. For this "Say Yes" step, please:
          </p>
          <ul className="list-disc text-left text-gray-600 space-y-2 max-w-md mx-auto">
            <li>Use Chrome, Edge, or Safari (desktop) with microphone permissions enabled</li>
            <li>Ensure you're on HTTPS or localhost</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="mb-6">
          {listening ? (
            <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 bg-white rounded-full"></div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">Say "Yes" to Continue</h2>
        <p className="text-lg text-gray-700 mb-6">
          {listening 
            ? 'Listening... Please say "Yes" clearly into your microphone.' 
            : 'Click "Start Listening" and then say "Yes" clearly into your microphone.'}
        </p>

        <div className="mb-6">
          {!listening ? (
            <button
              onClick={startListening}
              disabled={!supported}
              className={`${supported 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-400 cursor-not-allowed'
              } text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center mx-auto`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
Start Listening
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center mx-auto"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
              </svg>
              Stop Listening
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 rounded-xl p-4 mb-4">
            <div className="text-sm text-red-600">Error: {error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
