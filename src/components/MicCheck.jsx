import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function MicCheck() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email } = location.state || {};
  const [micStatus, setMicStatus] = useState('checking'); // 'checking', 'available', 'unavailable'
  const [isChecking, setIsChecking] = useState(true);
  const isInitialCheck = useRef(true);

  // Redirect if no user data
  useEffect(() => {
    if (!name || !email) {
      navigate('/');
    }
  }, [name, email, navigate]);

  if (!name || !email) {
    return null;
  }

  useEffect(() => {
    const checkMicrophone = async () => {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMicStatus('unavailable');
          setIsChecking(false);
          toast.error("Microphone access not supported in this browser.");
          return;
        }

        // Try to get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Check if we actually got audio tracks
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          setMicStatus('available');
          // Only show toast on initial check, not on retry
          if (isInitialCheck.current) {
            toast.success("Microphone is available and working!");
          }
        } else {
          setMicStatus('unavailable');
          toast.error("No microphone detected. Please check your microphone.");
        }

        // Stop the stream immediately after checking
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        console.error('Microphone check error:', error);
        setMicStatus('unavailable');
        toast.error("Microphone access denied or not available. Please check your microphone permissions.");
      } finally {
        setIsChecking(false);
      }
    };

    checkMicrophone();
    // Mark that initial check is done
    isInitialCheck.current = false;
  }, []);

  const handleContinue = () => {
    if (micStatus === 'available') {
      navigate('/assessment-guidelines', { state: { name, email } });
    }
  };

  const handleRetry = () => {
    setMicStatus('checking');
    setIsChecking(true);
    // Retry microphone check
    setTimeout(() => {
      const checkMicrophone = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0) {
            setMicStatus('available');
            toast.success("Microphone is now available!");
          } else {
            setMicStatus('unavailable');
            toast.error("No microphone detected. Please check your microphone.");
          }
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          setMicStatus('unavailable');
          toast.error("Microphone access denied. Please check permissions.");
        } finally {
          setIsChecking(false);
        }
      };
      checkMicrophone();
    }, 100);
  };

  const getStatusIcon = () => {
    switch (micStatus) {
      case 'checking':
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
      case 'available':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
      case 'unavailable':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (micStatus) {
      case 'checking':
        return {
          title: "Checking Microphone...",
          description: "Please wait while we check your microphone availability.",
          color: "text-blue-600"
        };
      case 'available':
        return {
          title: "Microphone Available!",
          description: "Your microphone is working properly. You're all set for the assessment.",
          color: "text-green-600"
        };
      case 'unavailable':
        return {
          title: "Microphone Not Available",
          description: "We couldn't access your microphone. Please check your microphone and permissions.",
          color: "text-red-600"
        };
      default:
        return {
          title: "",
          description: "",
          color: ""
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Microphone Check</h1>
            <p className="text-gray-600">We need to verify your microphone before starting the assessment</p>
          </div>

          {/* Status Display */}
          <div className="text-center mb-8">
            {getStatusIcon()}
            <h2 className={`text-xl font-semibold mb-2 ${getStatusText().color}`}>
              {getStatusText().title}
            </h2>
            <p className="text-gray-600">{getStatusText().description}</p>
          </div>

          {/* Instructions */}
          <div className="mb-8 p-6 bg-blue-50 rounded-xl">
            <h3 className="font-semibold text-blue-800 mb-3">What we're checking:</h3>
            <ul className="text-blue-700 text-sm space-y-2">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Microphone hardware availability</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Browser microphone permissions</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Audio input device functionality</span>
              </li>
            </ul>
          </div>

                     {/* Action Buttons */}
           <div className="flex justify-center">
             {micStatus === 'available' && (
               <button
                 onClick={handleContinue}
                 className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
               >
                 Continue to Assessment
               </button>
             )}
             
             {micStatus === 'unavailable' && (
               <button
                 onClick={handleRetry}
                 className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
               >
                 Retry Microphone Check
               </button>
             )}
           </div>

          {/* Troubleshooting Tips */}
          {micStatus === 'unavailable' && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Troubleshooting Tips:</h4>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Make sure your microphone is connected and not muted</li>
                <li>• Check browser permissions for microphone access</li>
                <li>• Try refreshing the page and allowing microphone access</li>
                <li>• Ensure no other applications are using your microphone</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 