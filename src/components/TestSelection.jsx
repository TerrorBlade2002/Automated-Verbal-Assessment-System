import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { checkUserHasTakenAssessment } from '../utils/firebaseUtils';

export default function TestSelection() {
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

  const handleTestSelect = () => {
    navigate('/assessment-start', { state: { name, email } });
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {name}!</h1>
            <p className="text-gray-600">Select a test to begin</p>
          </div>

          <div className="flex justify-center">
            {/* Take an Interview - Only Test Option */}
            <div 
              onClick={handleTestSelect}
              className="p-8 border-2 border-blue-500 rounded-xl hover:border-blue-600 hover:shadow-lg transition duration-200 cursor-pointer group bg-blue-50 max-w-md w-full"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-300 transition duration-200">
                  <svg className="w-10 h-10 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">Take an Interview</h3>
                <p className="text-gray-600 text-base mb-4">AI-powered English speech evaluation assessment(Interview Setting)</p>
                <div className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                  Featured Test
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              ← Back to registration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 