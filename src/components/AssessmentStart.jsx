import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { checkUserHasTakenAssessment } from '../utils/firebaseUtils';

export default function AssessmentStart() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email } = location.state || {};
  const [isChecking, setIsChecking] = useState(true);

  // Redirect if no user data
  useEffect(() => {
    if (!name || !email) {
      navigate('/');
    }
  }, [name, email, navigate]);

  if (!name || !email) {
    return null;
  }

  // Check if user has already taken assessment
  useEffect(() => {
    const checkAssessmentStatus = async () => {
      try {
        const hasTakenAssessment = await checkUserHasTakenAssessment(email);
        if (hasTakenAssessment) {
          toast.error("You have already taken the assessment or your previous attempt was marked as failed. You cannot take it again.");
          navigate('/');
          return;
        }
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking assessment status:', error);
        setIsChecking(false);
      }
    };

    checkAssessmentStatus();
  }, [email, navigate]);

  const handleStartAssessment = () => {
    navigate('/mic-check', { state: { name, email } });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking assessment status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Astra Business Services Verbal Assessment</h1>
            <p className="text-gray-600">Welcome, {name}!</p>
          </div>

          {/* Important Warning */}
          <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notice</h3>
                <p className="text-yellow-700 text-sm">
                  This assessment must be completed in one session. Please ensure you have:
                </p>
                <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside space-y-1">
                  <li>A quiet environment with minimal background noise</li>
                  <li>A working microphone</li>
                  <li>Stable internet connection</li>
                  <li>Approximately 10-15 minutes of uninterrupted time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Assessment Overview */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Assessment Overview</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Guidelines & Instructions</h3>
                  <p className="text-gray-600 text-sm">Review test guidelines and understand the format</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">3 Interview Questions</h3>
                  <p className="text-gray-600 text-sm">Answer 3 interview questions with voice recordings</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">AI - Powered Scoring</h3>
                  <p className="text-gray-600 text-sm">Your responses will be analyzed for English proficiency and communication skills using a highly trained and efficient model.</p>
                </div>
              </div>
            </div>
          </div>

                     {/* Action Buttons */}
           <div className="flex justify-center">
             <button
               onClick={handleStartAssessment}
               className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
             >
               Start Assessment
             </button>
           </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your assessment results will be securely stored and used for recruitment evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 