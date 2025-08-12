import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function ExamBrowserIntro() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, userId } = location.state || {};
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const handleStartAssessment = () => {
    if (!agreedToTerms || !understood) {
      toast.error("Please read and agree to all terms before proceeding.");
      return;
    }

    // Navigate to video instructions (before fullscreen)
    navigate('/video-instructions', { 
      state: { name, email, userId } 
    });
  };

  const handleGoBack = () => {
    navigate('/assessment-guidelines', { 
      state: { name, email, userId } 
    });
  };

  if (!name || !email) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Secure Exam Browser Mode
            </h1>
            <p className="text-gray-600">
              This assessment uses advanced security measures to ensure exam integrity
            </p>
          </div>

          {/* Security Features */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              🛡️ Security Features Activated
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-2">1</span>
                  Fullscreen Lockdown
                </h3>
                <p className="text-blue-700 text-sm">
                  Your browser will enter fullscreen mode and prevent access to other applications, tabs, or windows.
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm mr-2">2</span>
                  Keyboard Controls
                </h3>
                <p className="text-green-700 text-sm">
                  Navigation shortcuts (Alt+Tab, F5, Ctrl+R, etc.) are disabled to prevent cheating attempts.
                </p>
              </div>

              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm mr-2">3</span>
                  Activity Monitoring
                </h3>
                <p className="text-orange-700 text-sm">
                  The system monitors for tab switching, focus loss, and other suspicious activities.
                </p>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm mr-2">4</span>
                  Violation Tracking
                </h3>
                <p className="text-red-700 text-sm">
                  Security violations are logged. Critical violations will result in immediate exam termination.
                </p>
              </div>
            </div>
          </div>

          {/* What's Blocked */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              ⛔ What's Blocked During the Assessment
            </h2>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-red-800 mb-2">Navigation & Shortcuts</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• Browser back/forward buttons</li>
                    <li>• Alt+Tab (window switching)</li>
                    <li>• F5, Ctrl+R (page refresh)</li>
                    <li>• Ctrl+T (new tab)</li>
                    <li>• Ctrl+W (close tab)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-800 mb-2">System Functions</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• Right-click context menu</li>
                    <li>• Developer tools (F12)</li>
                    <li>• Copy/paste operations</li>
                    <li>• Print functionality</li>
                    <li>• Screenshot attempts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Browser Requirements */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              💻 Browser Compatibility & Requirements
            </h2>
            
            {/* Supported Browsers */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">✅ Fully Supported Browsers</h3>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• <strong>Chrome 71+</strong> (Recommended)</li>
                  <li>• <strong>Microsoft Edge 79+</strong> (Recommended)</li>
                  <li>• <strong>Firefox 64+</strong> (Good support)</li>
                  <li>• <strong>Safari 16.4+</strong> (Limited features)</li>
                </ul>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">❌ Not Supported</h3>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>• Internet Explorer (any version)</li>
                  <li>• Chrome/Edge below version 71/79</li>
                  <li>• Safari below version 16.4</li>
                  <li>• Mobile browsers (iOS/Android)</li>
                </ul>
              </div>
            </div>
{/* 
            Feature Support Details
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">🔧 Feature Support by Browser</h3>
              <div className="text-blue-700 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <strong>Fullscreen Lock:</strong>
                    <ul className="ml-4 mt-1">
                      <li>• Chrome/Edge: ✅ Full support</li>
                      <li>• Firefox: ✅ Full support</li>
                      <li>• Safari: ✅ Full support</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Keyboard Lock:</strong>
                    <ul className="ml-4 mt-1">
                      <li>• Chrome/Edge: ✅ Full support</li>
                      <li>• Firefox: ❌ Not supported</li>
                      <li>• Safari: ❌ Not supported</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div> */}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="text-yellow-600 text-2xl mb-3">⚠️</div>
              <p className="text-yellow-800 font-medium mb-4">
                Important Setup Requirements:
              </p>
              <ul className="text-yellow-700 text-sm space-y-2 list-none">
                <li>• <strong>Use Chrome or Microsoft Edge for best experience</strong></li>
                <li>• Allow fullscreen permission when prompted</li>
                <li>• Close all other tabs and applications before starting</li>
                <li>• Ensure stable internet connection</li>
                <li>• Use a desktop/laptop computer (not mobile devices)</li>
                <li>• Disable browser extensions that might interfere</li>
              </ul>
            </div>
          </div>

          {/* Agreement Checkboxes */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              ✅ Agreement Required
            </h2>
            
            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">
                  <strong>I understand</strong> that this assessment uses secure browser technology and that attempting to bypass security measures will result in immediate exam termination.
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">
                  <strong>I agree</strong> to take this assessment in a secure environment without external assistance, and I understand that violations will be logged and may result in exam termination.
                </span>
              </label>
            </div>
          </div>

          {/* Final Warning */}
          <div className="mb-8">
            <div className="bg-red-100 border border-red-300 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="text-red-600 text-2xl">🚨</div>
                <div>
                  <h3 className="font-bold text-red-800 mb-2">IMPORTANT WARNING</h3>
                  <p className="text-red-700 text-sm">
                    Once you start the assessment, you CANNOT go back, refresh, or leave the page. 
                    Any attempt to do so will result in immediate termination of your assessment and 
                    you will NOT be allowed to retake it.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleGoBack}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Go Back to Guidelines
            </button>

            <button
              onClick={handleStartAssessment}
              disabled={!agreedToTerms || !understood}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                agreedToTerms && understood
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              🔒 Enter Fullscreen & Start Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}