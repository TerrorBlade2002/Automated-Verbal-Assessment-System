import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function AssessmentResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, results, assessmentId, overallScore, timingData } = location.state || {};
  
  const [assessmentData, setAssessmentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if no user data
  if (!name || !email) {
    navigate('/');
    return null;
  }

  // Handle browser back button - redirect to registration
  useEffect(() => {
    const handlePopState = (event) => {
      // Prevent default back navigation
      event.preventDefault();
      // Redirect to registration page
      navigate('/', { replace: true });
    };

    // Add event listener for browser back button
    window.addEventListener('popstate', handlePopState);
    
    // Push a state to history to handle back button
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Fetch assessment results from Python backend
  useEffect(() => {
    const fetchAssessmentResults = async () => {
      if (!assessmentId) {
        // Use passed results if no assessmentId
        setAssessmentData({
          results: results || [],
          overall_score: overallScore || 0,
          assessment_summary: timingData || {}
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:3001/api/assessment/${assessmentId}/results?user_id=${encodeURIComponent(email)}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch assessment results');
        }
        
        const data = await response.json();
        console.log('Fetched assessment data:', data);
        setAssessmentData(data);
      } catch (err) {
        console.error('Error fetching assessment results:', err);
        setError(err.message);
        // Fallback to passed results
        setAssessmentData({
          results: results || [],
          overall_score: overallScore || 0,
          assessment_summary: timingData || {}
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentResults();
  }, [assessmentId, email, results, overallScore, timingData]);



  // Get unique results (avoid duplicates)
  const getUniqueResults = () => {
    if (!assessmentData?.results) return [];
    
    const seen = new Set();
    return assessmentData.results.filter(result => {
      const key = result.question_id || result.questionId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const uniqueResults = getUniqueResults();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assessment results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Submitted Successfully!</h1>
            <p className="text-gray-600">Thank you for completing the verbal communication assessment</p>
          </div>

          {/* Assessment Info */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold">Assessment ID:</span> {assessmentId || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Questions Completed:</span> {uniqueResults.length}/3
              </div>
              <div>
                <span className="font-semibold">Status:</span> {assessmentData?.completion_status || 'Completed'}
              </div>
            </div>
          </div>



          {/* Questions Completed Summary */}
          {uniqueResults && uniqueResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Assessment Summary</h3>
              <div className="space-y-4">
                {uniqueResults.map((result, index) => {
                  const questionNumber = result.question_id ? result.question_id.replace('q', '') : index + 1;
                  
                  return (
                    <div key={result.question_id || index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Question {questionNumber}: {result.category || `Question ${questionNumber}`}
                          </h4>
                          <p className="text-gray-600 text-sm mb-3">
                            {result.question || `Assessment question ${questionNumber}`}
                          </p>
                          
                          {/* Response Info - No Scores */}
                          <div className="text-xs text-gray-500">
                            <span>✅ Response recorded</span>
                            <span className="ml-4">Duration: {result.duration || 0}s</span>
                            {result.transcription && (
                              <span className="ml-4">
                                Audio processed successfully
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Assessment Complete - No Action Buttons */}
          <div className="text-center">
            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Assessment Submitted!</h3>
              <p className="text-green-700">
                Your verbal assessment has been successfully submitted and securely stored.
              </p>
              <p className="text-green-700 mt-2">
                Our recruitment team will review your responses and contact you with next steps.
              </p>
              <p className="text-sm text-green-600 mt-3">
                Reference ID: <span className="font-mono bg-white px-2 py-1 rounded border">
                  {assessmentId || `ASS-${Date.now().toString().slice(-6)}`}
                </span>
              </p>
            </div>
            
            <div className="mt-6">
              <p className="text-xs text-gray-500">
                Your assessment responses have been recorded. Please keep the reference ID for your records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 