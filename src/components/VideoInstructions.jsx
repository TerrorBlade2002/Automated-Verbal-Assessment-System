import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import scene1Video from '../assets/Scene 1.mp4';
import scene2Video from '../assets/Scene 2.mp4';
import YesCheck from './YesCheck';

export default function VideoInstructions() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, userId } = location.state || {};
  
  const [currentPhase, setCurrentPhase] = useState('scene1'); // 'scene1', 'yescheck', 'scene2', 'ready'
  
  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);

  // Redirect if no user data
  useEffect(() => {
    if (!name || !email) {
      navigate('/');
    }
  }, [name, email, navigate]);

  if (!name || !email) {
    return null;
  }

  // Auto-play Scene 1 when component mounts
  useEffect(() => {
    if (videoRef1.current && currentPhase === 'scene1') {
      videoRef1.current.play().catch(error => {
        console.error('Error playing Scene 1:', error);
        toast.error('Failed to play video. Please check your browser settings.');
      });
    }
  }, [currentPhase]);

  // Handle Scene 1 video ended
  const handleScene1Ended = () => {
    setCurrentPhase('yescheck');
    toast.info('Please say "Yes" clearly into your microphone to continue.');
  };

  // YesCheck handlers
  const handleYesDetected = () => {
    console.log('VideoInstructions - handleYesDetected called!');
    toast.success('Great! "Yes" detected. Playing instruction video...');
    playScene2();
  };

  const handleYesFailed = (heard) => {
    console.log('Did not detect "Yes". Heard:', heard);
    toast.error('Please clearly say "Yes" and try again.');
  };

  const playScene2 = () => {
    console.log('VideoInstructions - playScene2 called! Setting phase to scene2');
    setCurrentPhase('scene2');
    
    setTimeout(() => {
      if (videoRef2.current) {
        console.log('VideoInstructions - Playing Scene 2 video');
        videoRef2.current.play().catch(error => {
          console.error('Error playing Scene 2:', error);
          toast.error('Failed to play second video.');
        });
      } else {
        console.error('VideoInstructions - videoRef2.current is null!');
      }
    }, 500);
  };

  const handleScene2Ended = () => {
    setCurrentPhase('ready');
    toast.success('Ready to start the test!');
  };

  const handleStartTest = () => {
    navigate('/fullscreen-entry', { 
      state: { name, email, userId } 
    });
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto p-4">
        
        {/* Scene 1 Video */}
        {currentPhase === 'scene1' && (
          <div className="text-center bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Instruction Video - Part 1</h2>
            <video
              ref={videoRef1}
              width="192"
              height="108"
              controls={false}
              onEnded={handleScene1Ended}
              className="rounded-lg shadow-lg mx-auto"
            >
              <source src={scene1Video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="mt-4 text-gray-700">
              <p className="text-lg">Please watch the instruction video...</p>
            </div>
          </div>
        )}

        {/* YesCheck Phase */}
        {currentPhase === 'yescheck' && (
          <div className="text-center">
            <YesCheck
              strict={false}
              locale="en-US"
              timeoutMs={10000}
              onPass={handleYesDetected}
              onFail={handleYesFailed}
            />
          </div>
        )}

        {/* Scene 2 Video */}
        {currentPhase === 'scene2' && (
          <div className="text-center bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Instruction Video - Part 2</h2>
            <video
              ref={videoRef2}
              width="192"
              height="108"
              controls={false}
              onEnded={handleScene2Ended}
              className="rounded-lg shadow-lg mx-auto"
            >
              <source src={scene2Video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="mt-4 text-gray-700">
              <p className="text-lg">Please watch the final instruction video...</p>
            </div>
          </div>
        )}

        {/* Ready to Start */}
        {currentPhase === 'ready' && (
          <div className="text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100">
              <div className="text-6xl mb-6">✅</div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Ready to Begin!</h2>
              <p className="text-lg mb-8 text-gray-700">
                You have successfully completed the pre-test setup. 
                Click the button below to proceed to the secure assessment environment.
              </p>
              
              <button
                onClick={handleStartTest}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-lg text-xl transition duration-200 transform hover:scale-105"
              >
                Continue to Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
