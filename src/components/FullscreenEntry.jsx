import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export default function FullscreenEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, userId } = location.state || {};

  const handleEnterFullscreen = async () => {
    try {
      // Enter fullscreen
      await document.documentElement.requestFullscreen();
      
      // Small delay to ensure fullscreen is established
      setTimeout(() => {
        navigate('/assessment-questions', { 
          state: { name, email, userId } 
        });
      }, 100);
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      // Still navigate, the ExamBrowserMode will handle it
      toast.warning('Fullscreen mode failed. Continuing with assessment...');
      navigate('/assessment-questions', { 
        state: { name, email, userId } 
      });
    }
  };

  if (!name || !email) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center text-white max-w-2xl mx-auto p-8">
        <div className="text-6xl mb-8">🔒</div>
        <h1 className="text-4xl font-bold mb-6">Ready to Begin Assessment</h1>
        <p className="text-xl mb-8 text-gray-300">
          Click the button below to enter fullscreen mode and start your assessment.
        </p>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <p className="text-yellow-300 mb-4">⚠️ Important:</p>
          <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
            <li>Once you enter fullscreen mode, you cannot exit until the assessment is complete</li>
            <li>Any attempt to leave fullscreen will result in immediate termination of your assessment</li>
            <li>Any attempt to use your keyboard will result in immediate termination of your assessment</li>
            <li>You're only allowed to use your mouse during the assessment</li>
          </ul>
        </div>

        <button
          onClick={handleEnterFullscreen}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-200 transform hover:scale-105"
        >
          🔒 Click to Enter Fullscreen & Start Assessment
        </button>
      </div>
    </div>
  );
}

