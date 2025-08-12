import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  createFinalAssessment,
  updateAssessment,
  checkUserHasTakenAssessment 
} from '../utils/firebaseUtils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ExamBrowserMode from './ExamBrowserMode';
import Scene3Video from '../assets/Scene 3.mp4';
import Scene4Video from '../assets/Scene 4.mp4';
import Scene5Video from '../assets/Scene 5.mp4';
import Scene6Video from '../assets/Scene 6.mp4';
import Scene7Video from '../assets/Scene 7.mp4';
import Scene8Video from '../assets/Scene 8.mp4';

// Helper function to convert blob to Base64
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };
  
  // Helper function to convert Base64 to blob
  const base64ToBlob = (base64, type) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };


// Get video for current question
const getQuestionVideo = (questionIndex) => {
  const videoMap = {
    0: Scene3Video, // Question 1 - Scene 3
    1: Scene5Video, // Question 2 - Scene 5
    2: Scene7Video  // Question 3 - Scene 7
  };
  return videoMap[questionIndex] || Scene3Video; // Default to Scene 3
};

// Call center interview questions
const QUESTIONS = [
  {
    id: 1,
    question: "Can you briefly introduce yourself? Feel free to include your name, where you're from, and something interesting about you.",
    timeLimit: 60, // 1 minute recording
    prepTime: 30, // 30 seconds preparation
    category: "Introduction"
  },
  {
    id: 2,
    question: "Why do you want to work at Astra Business Services, and do you have any prior experience working in a BPO?",
    timeLimit: 60, // 1 minute recording
    prepTime: 30, // 30 seconds preparation
    category: "Motivation & Performance"
  },
  {
    id: 3,
    question: "What are your goals for the next 5 years, and how do you plan to achieve them?",
    timeLimit: 60, // 1 minute recording
    prepTime: 30, // 30 seconds preparation
    category: "Goals"
  }
];

export default function AssessmentQuestions() {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, userId } = location.state || {};

  // State management
  const [currentQuestion, setCurrentQuestion] = useState(
    () => Number(sessionStorage.getItem('currentQuestion')) || 0
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(
    () => JSON.parse(sessionStorage.getItem('results')) || []
  );
  const [timeLeft, setTimeLeft] = useState(QUESTIONS[0].prepTime);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [assessmentId, setAssessmentId] = useState(
    () => sessionStorage.getItem('assessmentId') || null
  );
  const [examBrowserActive, setExamBrowserActive] = useState(false);
  const [securityViolations, setSecurityViolations] = useState([]);
  
  // New timer phases: 'preparation' | 'recording' | 'completed'
  const [timerPhase, setTimerPhase] = useState('preparation');
  const [isPreparationActive, setIsPreparationActive] = useState(false);
  
  // Question video state - starts playing only after entering fullscreen (Scene 3, 5, or 7)
  const [isScene3Playing, setIsScene3Playing] = useState(false);
  const [scene3Ended, setScene3Ended] = useState(false);
  const scene3VideoRef = useRef(null);

  // Scene 4 video state - plays after question 1 is processed
  const [isScene4Playing, setIsScene4Playing] = useState(false);
  const [scene4Ended, setScene4Ended] = useState(false);
  const scene4VideoRef = useRef(null);

  // Scene 6 video state - plays after question 2 is processed
  const [isScene6Playing, setIsScene6Playing] = useState(false);
  const [scene6Ended, setScene6Ended] = useState(false);
  const scene6VideoRef = useRef(null);

  // Scene 8 video state - plays after question 3 is processed
  const [isScene8Playing, setIsScene8Playing] = useState(false);
  const [scene8Ended, setScene8Ended] = useState(false);
  const scene8VideoRef = useRef(null);
  
  // Assessment timing tracking
  const [assessmentStartTime, setAssessmentStartTime] = useState(
    () => sessionStorage.getItem('assessmentStartTime') || null
  );
  const [questionStartTimes, setQuestionStartTimes] = useState(
    () => JSON.parse(sessionStorage.getItem('questionStartTimes')) || {}
  );
  const [assessmentEndTime, setAssessmentEndTime] = useState(null);


  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('currentQuestion', currentQuestion);
  }, [currentQuestion]);

  useEffect(() => {
    sessionStorage.setItem('results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    if (assessmentId) {
      sessionStorage.setItem('assessmentId', assessmentId);
    }
  }, [assessmentId]);

  // Restore audio from sessionStorage on page load
  useEffect(() => {
    const restoreAudio = async () => {
      const savedAudio = sessionStorage.getItem(`audio_${currentQuestion}`);
      if (savedAudio) {
        try {
          const blob = await base64ToBlob(savedAudio, 'audio/webm');
          setRecordedAudio(blob);
        } catch (error) {
          console.error("Error restoring audio from sessionStorage:", error);
        }
      }
    };
    restoreAudio();
  }, [currentQuestion]);


  // Redirect if no user data or marked for redirect
  useEffect(() => {
    if (!name || !email || shouldRedirect) {
      navigate('/');
    }
  }, [name, email, navigate, shouldRedirect]);

  // Check if user has already taken assessment
  useEffect(() => {
    const checkAssessmentStatus = async () => {
      if (!email) {
        console.log('No email, skipping assessment status check');
        return;
      }
      
      console.log('Checking assessment status for:', email);
      
      try {
        const hasTakenAssessment = await checkUserHasTakenAssessment(email);
        console.log('Assessment status check result:', hasTakenAssessment);
        
        if (hasTakenAssessment) {
          toast.error("You have already taken the assessment. You cannot take it again.");
          setShouldRedirect(true);
          return;
        }
        
        console.log('Setting isChecking to false - user can take assessment');
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking assessment status:', error);
        toast.error("An error occurred while checking your assessment status.");
        setShouldRedirect(true);
      }
    };

    checkAssessmentStatus();
  }, [email]);

  // No initial assessment creation - only create when user enters fullscreen

  // Activate Exam Browser Mode when user data is ready
  useEffect(() => {
    console.log('Exam browser activation check:', {
      isCompleted,
      isChecking,
      examBrowserActive,
      name,
      email
    });
    
    // If user data exists and checking is done, activate exam browser
    if (name && email && !isCompleted && !isChecking) {
      if (!examBrowserActive) {
        console.log('Activating exam browser mode...');
        setExamBrowserActive(true);
      }
    } else if (examBrowserActive && (isCompleted || isChecking || (!name || !email))) {
      console.log('Deactivating exam browser mode...');
      setExamBrowserActive(false);
    }
  }, [isCompleted, isChecking, examBrowserActive, name, email]);

  // Handle Security Violations
  const handleSecurityViolation = async (violation) => {
    setSecurityViolations(prev => [...prev, violation]);
    
    // Log violation to Firebase
    try {
      if (assessmentId) {
        // You might want to create a separate function to log violations
        console.log('Security violation logged:', violation);
      }
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }

    // Check if violation should terminate assessment
    const criticalViolations = ['fullscreen_exit', 'dev_tools', 'screenshot', 'esc_pressed', 'esc_exit_terminate'];
    const violationCount = securityViolations.length + 1;

    if (criticalViolations.includes(violation.type) || violationCount >= 3) {
      toast.error(`🚨 CRITICAL VIOLATION: Assessment will be terminated!`);
      
      setTimeout(async () => {
        await handleAssessmentFailure('security_violation', violation);
      }, 2000);
    }
  };

  // Assessment Failure Handler - creates failed assessment entry
  const handleAssessmentFailure = async (reason = 'navigation_attempt', violationDetails = null) => {
    try {
      // Mark in localStorage immediately
      localStorage.setItem('assessment_terminated', JSON.stringify({
        email: email,
        timestamp: Date.now(),
        reason: reason,
        violation: violationDetails,
        securityViolations: securityViolations
      }));

      // Create failed assessment data with all scores till violation point
      const failedAssessmentData = {
        overallScore: 0,
        questions: results.map((result, index) => ({
          questionNumber: index + 1,
          question: QUESTIONS[index].question,
          audioUrl: result.audioUrl || null,
          scores: result.scores || {
            pronunciation: 0,
            fluency: 0,
            clarity: 0,
            confidence: 0,
            overall: 0
          },
          transcription: result.transcription || "No transcription available",
          duration: result.duration || 0,
          wordCount: result.wordCount || 0,
          speechSuperResponse: result.speechSuperResponse || null  // Keep all data for failed too
        })),
        completedAt: new Date().toISOString(),
        timingData: {
          assessmentStartTime: assessmentStartTime,
          assessmentEndTime: new Date().toISOString(),
          questionStartTimes: questionStartTimes,
          totalDuration: calculateTotalDuration()
        }
      };

      // Full data for fallback creation
      const fullFailedAssessmentData = {
        user_id: email,  // Use email as user_id to match backend
        userName: name,
        assessmentType: "call_center_interview",
        startedAt: assessmentStartTime || new Date().toISOString(),
        ...failedAssessmentData
      };

      try {
        // Find existing assessment created by backend and update to failed
        const assessmentsRef = collection(db, 'assessments');
        const q = query(assessmentsRef, where('user_id', '==', email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          // Update existing assessment to failed
          const existingAssessment = snapshot.docs[0];
          const result = await updateAssessment(existingAssessment.id, {
            ...failedAssessmentData,
            status: 'failed',
            completed_questions: results.length,  // Number of questions completed before failure
            progress_percentage: (results.length / 3) * 100  // Assuming 3 total questions
          });
          if (result.success) {
            setAssessmentId(existingAssessment.id);
            console.log('Assessment marked as failed:', existingAssessment.id);
          }
        } else {
          // Fallback - create failed assessment if no existing assessment found
          const result = await createFinalAssessment(fullFailedAssessmentData, 'failed');
          if (result.success) {
            setAssessmentId(result.assessmentId);
            console.log('Failed assessment created:', result.assessmentId);
          }
        }
      } catch (fbError) {
        console.error('Failed to handle failed assessment:', fbError);
      }

      // Deactivate exam browser mode
      setExamBrowserActive(false);

      toast.error("🚨 Assessment terminated! You cannot attempt again.");
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error terminating assessment:', error);
      setExamBrowserActive(false);
      navigate('/');
    }
  };

  // Assessment timing effects
  useEffect(() => {
    // Set start time when first question begins (only if not already set)
    if (currentQuestion === 0 && !assessmentStartTime) {
      const startTime = new Date().toISOString();
      setAssessmentStartTime(startTime);
      sessionStorage.setItem('assessmentStartTime', startTime);
    }
    
    // Track individual question start times
    const questionKey = `q${currentQuestion + 1}`;
    if (!questionStartTimes[questionKey]) {
      const questionStartTime = new Date().toISOString();
      const newQuestionStartTimes = { ...questionStartTimes, [questionKey]: questionStartTime };
      setQuestionStartTimes(newQuestionStartTimes);
      sessionStorage.setItem('questionStartTimes', JSON.stringify(newQuestionStartTimes));
    }
    
    // Set end time when assessment is completed (question 3)
    if (currentQuestion === 2 && isCompleted) {  // currentQuestion is 0-indexed
      const endTime = new Date().toISOString();
      setAssessmentEndTime(endTime);
      sessionStorage.setItem('assessmentEndTime', endTime);
    }
  }, [currentQuestion, assessmentStartTime, questionStartTimes, isCompleted]);

  // Timer effect for preparation and recording phases
  useEffect(() => {
    if ((timerPhase === 'preparation' && isPreparationActive) || (timerPhase === 'recording' && isRecording)) {
      if (timeLeft > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              // Handle phase transitions
              if (timerPhase === 'preparation') {
                // Preparation ended, start recording automatically
                setTimerPhase('recording');
                setTimeLeft(QUESTIONS[currentQuestion].timeLimit);
                startRecordingAutomatic();
                return QUESTIONS[currentQuestion].timeLimit;
              } else if (timerPhase === 'recording') {
                // Recording ended, stop automatically
                stopRecording();
                setTimerPhase('completed');
                return 0;
              }
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerPhase, isPreparationActive, isRecording, timeLeft, currentQuestion]);

  // Auto-start preparation timer when question loads (for first question and after exam mode is active)
  // Modified to wait for question video to end
  useEffect(() => {
    if (examBrowserActive && !isCompleted && !isRecording && !recordedAudio && timerPhase !== 'recording' && scene3Ended) {
      // Start preparation timer after question video ends
      const timer = setTimeout(() => {
        if (timerPhase !== 'recording' && !isPreparationActive) {
          startPreparationTimer();
        }
      }, 500); // Brief delay after video ends
      
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, examBrowserActive, isCompleted, isRecording, recordedAudio, timerPhase, isPreparationActive, scene3Ended]);

  // Comprehensive Navigation Protection - Multiple Techniques Combined
  useEffect(() => {
    if (isCompleted || !examBrowserActive) return;

    // 1. History Manipulation - Push multiple states to trap user
    const pushHistoryState = () => {
      const currentUrl = window.location.href;
      // Push multiple history entries to make back navigation harder
      for (let i = 0; i < 10; i++) {
        window.history.pushState({ preventBack: true }, '', currentUrl);
      }
    };

    // 2. Prevent Back Button Navigation
    const handlePopState = (e) => {
      // Force user to stay on current page
      pushHistoryState();
      toast.warning("❌ Navigation blocked! You cannot go back during the assessment.");
      
      // Additional blocking mechanism
      window.history.forward();
      
      // Mark assessment as failed if user persists
      setTimeout(() => {
        if (!isCompleted) {
          handleAssessmentFailure();
        }
      }, 2000);
    };

    // 3. Enhanced Refresh/Close Protection
    const handleBeforeUnload = (e) => {
      if (isRecording) {
        stopRecording();
      }
      
      if (!isCompleted) {
        const message = "⚠️ WARNING: Leaving this page will end your assessment permanently! You cannot retake it. Are you sure?";
        e.returnValue = message;
        
        // Mark assessment as failed immediately
        handleAssessmentFailure();
        
        return message;
      }
    };

    // 4. Detect ANY Key Press - Immediate Assessment Termination (Zero Tolerance)
    const handleKeyDown = (e) => {
      // Zero tolerance - ANY key press terminates the assessment
      if (!isCompleted) {
        // Special handling for ESC key to ensure it's caught
        if (e.key === 'Escape' || e.keyCode === 27) {
          console.log(`🚨 ESC KEY DETECTED: Immediate assessment termination`);
          
          // Prevent default ESC behavior
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Show immediate error message for ESC
          toast.error(`🚫 ASSESSMENT TERMINATED! ESC key usage is strictly prohibited!`);
          
          // Immediately fail the assessment 
          handleAssessmentFailure('esc_key_violation', {
            timestamp: new Date().toISOString(),
            currentQuestion: currentQuestion + 1,
            keyPressed: 'Escape',
            keyCode: 27,
            message: `ESC KEY VIOLATION: User pressed ESC during assessment - Immediate termination`
          });
          
          return false;
        }
        
        // Handle all other keys
        e.preventDefault();
        e.stopPropagation();
        
        // Log the key press violation
        console.log(`ZERO TOLERANCE: Key press detected: ${e.key} - Terminating assessment immediately`);
        
        // Show immediate error message
        toast.error(`🚫 ASSESSMENT TERMINATED! Any keyboard use is prohibited. Key pressed: ${e.key}`);
        
        // Exit fullscreen immediately
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(console.error);
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        
        // Immediately fail the assessment and redirect to login
        handleAssessmentFailure('keyboard_usage_zero_tolerance', {
          timestamp: new Date().toISOString(),
          currentQuestion: currentQuestion + 1,
          keyPressed: e.key,
          keyCode: e.keyCode,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          message: `ZERO TOLERANCE: User pressed ${e.key} during assessment - Immediate termination`
        });
        
        return false;
      }
    };

    // 5. Context Menu Prevention (Right-click)
    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.warning("🚫 Right-click is disabled during the assessment!");
      return false;
    };

    // 6. Focus/Blur Detection (Tab switching detection)
    const handleVisibilityChange = () => {
      if (document.hidden && !isCompleted) {
        toast.error("⚠️ Tab switching detected! This may result in assessment termination.");
      }
    };

    const handleBlur = () => {
      if (!isCompleted) {
        toast.warning("⚠️ Window focus lost! Please stay focused on the assessment.");
      }
    };



    // 7. Assessment Failure Handler moved to global scope

    // Initialize protection
    pushHistoryState();



    // Add all event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    

    
    // General key handler for other keys
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      

      
      // Remove general key listeners
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [examBrowserActive, isCompleted, isRecording, email, navigate]);

  // Ensure question video plays when question changes or component mounts
  useEffect(() => {
    if (scene3VideoRef.current && isScene3Playing) {
      // Force video to reload with new source
      scene3VideoRef.current.load();
      scene3VideoRef.current.currentTime = 0; // Reset to beginning
      const playPromise = scene3VideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(console.error);
      }
    }
  }, [currentQuestion, isScene3Playing]);

  // Start video when fullscreen mode is activated or when question changes
  useEffect(() => {
    if (examBrowserActive && !scene3Ended && !isScene3Playing) {
      setIsScene3Playing(true);
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (scene3VideoRef.current) {
          scene3VideoRef.current.load();
          const playPromise = scene3VideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(console.error);
          }
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [examBrowserActive, scene3Ended, isScene3Playing, currentQuestion]);

  // Auto-play Scene 4 when triggered
  useEffect(() => {
    if (isScene4Playing && scene4VideoRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (scene4VideoRef.current) {
          scene4VideoRef.current.load();
          scene4VideoRef.current.currentTime = 0;
          const playPromise = scene4VideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(console.error);
          }
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isScene4Playing]);

  // Auto-play Scene 6 when triggered
  useEffect(() => {
    if (isScene6Playing && scene6VideoRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (scene6VideoRef.current) {
          scene6VideoRef.current.load();
          scene6VideoRef.current.currentTime = 0;
          const playPromise = scene6VideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(console.error);
          }
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isScene6Playing]);

  // Auto-play Scene 8 when triggered
  useEffect(() => {
    if (isScene8Playing && scene8VideoRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (scene8VideoRef.current) {
          scene8VideoRef.current.load();
          scene8VideoRef.current.currentTime = 0;
          const playPromise = scene8VideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(console.error);
          }
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isScene8Playing]);

  // Early return if no user data (after ALL hooks)
  if (!name || !email) {
    return null;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
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

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Question video handlers (Scene 3, 5, or 7)
  const handleScene3Ended = () => {
    setIsScene3Playing(false);
    setScene3Ended(true);
  };

  const handleScene3Start = () => {
    setIsScene3Playing(true);
    setScene3Ended(false);
  };

  // Scene 4 video handlers (plays after question 1 processing)
  const handleScene4Ended = () => {
    setIsScene4Playing(false);
    setScene4Ended(true);
    // After Scene 4 ends, proceed to question 2
    proceedToNextQuestion();
  };

  const handleScene4Start = () => {
    setIsScene4Playing(true);
    setScene4Ended(false);
  };

  // Scene 6 video handlers (plays after question 2 processing)
  const handleScene6Ended = () => {
    setIsScene6Playing(false);
    setScene6Ended(true);
    // After Scene 6 ends, proceed to question 3
    proceedToNextQuestion();
  };

  const handleScene6Start = () => {
    setIsScene6Playing(true);
    setScene6Ended(false);
  };

  // Scene 8 video handlers (plays after question 3 processing)
  const handleScene8Ended = () => {
    setIsScene8Playing(false);
    setScene8Ended(true);
    // After Scene 8 ends, proceed to assessment completion
    proceedToAssessmentCompletion();
  };

  const handleScene8Start = () => {
    setIsScene8Playing(true);
    setScene8Ended(false);
  };



  // Start preparation timer for question
  const startPreparationTimer = () => {
    setTimerPhase('preparation');
    setTimeLeft(QUESTIONS[currentQuestion].prepTime);
    setIsPreparationActive(true);
    setRecordedAudio(null);
    toast.info("Preparation time started. Use this time to think about your answer.");
  };

  // Automatic recording function (called after preparation ends)
  const startRecordingAutomatic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        try {
          const base64Audio = await blobToBase64(audioBlob);
          sessionStorage.setItem(`audio_${currentQuestion}`, base64Audio);
        } catch (error) {
          console.error("Error saving audio to sessionStorage:", error);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success("Recording started automatically! Speak your answer now.");
    } catch (error) {
      console.error('Error starting automatic recording:', error);
      toast.error("Failed to start recording. Please check microphone permissions.");
      setTimerPhase('completed');
    }
  };

  // Manual start recording (for initial manual flow if needed)
  const startRecording = async () => {
    startPreparationTimer();
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimerPhase('completed');
      setIsPreparationActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.info("Recording stopped. Processing your response...");
    }
  };

  // Process audio with SpeechSuper API
  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      // Use existing assessmentId if available, otherwise use a consistent placeholder
      let currentAssessmentId = assessmentId || 'backend_will_create';
      
      console.log(`🔍 Processing Q${currentQuestion + 1}: Using assessment ID: ${currentAssessmentId}`);
      
      // Convert audio to required format (WAV, mono, 16kHz)
      const audioBuffer = await convertAudioToWav(audioBlob);
      
      // Create FormData for API request (Python backend format)
      const formData = new FormData();
      formData.append('audio', audioBuffer, 'recording.wav');
      formData.append('user_id', email); // Use email as user_id
      formData.append('question_id', `q${currentQuestion + 1}`); // Current question number
      formData.append('assessment_id', currentAssessmentId); // Assessment ID

      // Make API request to SpeechSuper (Python backend)
      const response = await fetch('http://localhost:3001/api/speechsuper', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result = await response.json();
      
      // Update assessmentId if backend generated a new one
      if (result.assessment_id && result.assessment_id !== currentAssessmentId) {
        console.log(`🔄 Backend generated new assessment ID: ${currentAssessmentId} -> ${result.assessment_id}`);
        setAssessmentId(result.assessment_id);
      } else {
        console.log(`✅ Using existing assessment ID: ${currentAssessmentId}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert audio to WAV format
  const convertAudioToWav = async (audioBlob) => {
    // This is a simplified conversion - in production, you'd use a proper audio conversion library
    // For now, we'll return the blob as-is and handle conversion on the server side
    return audioBlob;
  };

  // Function to proceed to next question (called after transition videos end)
  const proceedToNextQuestion = () => {
    setCurrentQuestion(currentQuestion + 1);
    setRecordedAudio(null);
    // Reset timer phase and question video state for next question
    setTimerPhase('preparation');
    setTimeLeft(QUESTIONS[currentQuestion + 1].prepTime);
    setIsPreparationActive(false); // Will be activated when question video ends
    setIsScene3Playing(false); // Will be set to true by fullscreen effect
    setScene3Ended(false); // Reset video state for next question
    // Reset all transition video states
    setIsScene4Playing(false);
    setScene4Ended(false);
    setIsScene6Playing(false);
    setScene6Ended(false);
    setIsScene8Playing(false);
    setScene8Ended(false);
    toast.success("Moving to next question...");
  };

  // Function to complete assessment (called after Scene 8 ends)
  const proceedToAssessmentCompletion = async () => {
    // Complete assessment
    const endTime = new Date().toISOString();
    setAssessmentEndTime(endTime);
    setIsCompleted(true);
    
    // Save completed assessment to Firebase
    await saveResults(results);
    toast.success("Assessment completed! All responses processed.");
  };

  // Handle next question or complete assessment
  const handleNext = async () => {
    if (!recordedAudio) {
      toast.error("Please record your answer before proceeding.");
      return;
    }

    try {
      setIsProcessing(true);
      const result = await processAudio(recordedAudio);
      
      // Store comprehensive result from Python backend
      const questionResult = {
        questionId: QUESTIONS[currentQuestion].id,
        question: QUESTIONS[currentQuestion].question,
        category: QUESTIONS[currentQuestion].category,
        audioUrl: URL.createObjectURL(recordedAudio),
        
        // Extract structured data from Python backend response
        scores: result.scores || {
          overall: 0,
          pronunciation: 0,
          fluency: 0,
          rhythm: 0,
          integrity: 0,
          speed: 0
        },
        transcription: result.transcription || "No transcription available",
        duration: result.duration || 0,
        wordCount: result.word_count || 0,
        pauseCount: result.pause_count || 0,
        
        // Store complete SpeechSuper API response for detailed analysis
        speechSuperResponse: result.speechsuper_response || null,
        
        // Backend metadata
        tokenId: result.token_id,
        storedInDatabase: result.stored_in_database || false,
        
        // Legacy compatibility
        score: result,
        timestamp: Date.now(),
        
        // Question timing
        questionStartTime: questionStartTimes[`q${currentQuestion + 1}`] || new Date().toISOString(),
        questionEndTime: new Date().toISOString()
      };

      const updatedResults = [...results, questionResult];
      setResults(updatedResults);

      // Check which question was completed and play appropriate transition video
      if (currentQuestion === 0) {
        // After question 1, play Scene 4 before going to question 2
        toast.success("Response recorded. Playing transition video...");
        setIsScene4Playing(true);
        // Scene 4 will automatically proceed to question 2 when it ends via handleScene4Ended
      } else if (currentQuestion === 1) {
        // After question 2, play Scene 6 before going to question 3
        toast.success("Response recorded. Playing transition video...");
        setIsScene6Playing(true);
        // Scene 6 will automatically proceed to question 3 when it ends via handleScene6Ended
      } else if (currentQuestion === 2) {
        // After question 3 (final question), play Scene 8 before completing assessment
        toast.success("Response recorded. Playing final transition video...");
        setIsScene8Playing(true);
        // Scene 8 will automatically complete assessment when it ends via handleScene8Ended
      } else if (currentQuestion < QUESTIONS.length - 1) {
        // For any other questions (fallback), proceed normally
        proceedToNextQuestion();
      }
    } catch (error) {
      toast.error("Failed to process audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

    // Save results to Firebase (legacy support) and prepare for results display
    const saveResults = async (finalResults) => {
      try {
        // Get overall score from Python backend results
        const overallScore = calculateOverallScoreFromBackend(finalResults);
        
        const assessmentData = {
          questions: finalResults.map((result, index) => ({
            questionNumber: index + 1,
            question: QUESTIONS[index].question,
            audioUrl: result.audioUrl || null,
            scores: result.scores || {
              pronunciation: 0,
              fluency: 0,
              clarity: 0,
              confidence: 0,
              overall: 0
            },
            transcription: result.transcription || "No transcription available",
            duration: result.duration || 0,
            wordCount: result.wordCount || 0,
            speechSuperResponse: result.speechSuperResponse || null  // Store full response
          })),
          overallScore: overallScore,
          completedAt: assessmentEndTime || new Date().toISOString(),
          startedAt: assessmentStartTime,
          status: 'completed',
          timingData: {
            assessmentStartTime: assessmentStartTime,
            assessmentEndTime: assessmentEndTime || new Date().toISOString(),
            questionStartTimes: questionStartTimes,
            totalDuration: calculateTotalDuration()
          }
        };
  
        try {
          // Find existing assessment created by backend and update to completed
          const assessmentsRef = collection(db, 'assessments');
          const q = query(assessmentsRef, where('user_id', '==', email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            // Update existing assessment to completed
            const existingAssessment = snapshot.docs[0];
            const result = await updateAssessment(existingAssessment.id, {
              ...assessmentData,
              status: 'completed',
              completed_questions: 3,  // All 3 questions completed
              progress_percentage: 100  // 100% completion
            });
            if (result.success) {
              setAssessmentId(existingAssessment.id);
              sessionStorage.clear();
              toast.success("Results saved successfully!");
            }
          } else {
            // Fallback - create if no existing assessment found
            const result = await createFinalAssessment({
              ...assessmentData,
              user_id: email,  // Use email as user_id to match backend
              userName: name,
              assessmentType: "call_center_interview",
              startedAt: assessmentStartTime || new Date().toISOString()
            }, 'completed');
            
            if (result.success) {
              setAssessmentId(result.assessmentId);
              sessionStorage.clear();
              toast.success("Results saved successfully!");
            }
          }
        } catch (fbError) {
          console.warn("Firebase save failed:", fbError);
        }
        
        // Navigate to results (Python backend should have all the data)
        navigate('/assessment-results', { 
          state: { 
            name, 
            email, 
            results: finalResults,
            assessmentId,
            overallScore: overallScore,
            timingData: assessmentData.timingData
          } 
        });
        
      } catch (error) {
        console.error('Error in saveResults:', error);
        // Navigate to results anyway since Python backend should have the data
        toast.warning("Local save had issues, but your results are safely stored. Proceeding to results...");
        navigate('/assessment-results', { 
          state: { 
            name, 
            email, 
            results: finalResults,
            assessmentId
          } 
        });
      }
    };

  // Calculate total score
  // Calculate overall score from Python backend responses
  const calculateOverallScoreFromBackend = (results) => {
    const validScores = results
      .filter(result => result.scores && typeof result.scores.overall === 'number')
      .map(result => result.scores.overall);
    
    if (validScores.length === 0) return 0;
    
    // Calculate average of overall scores across all questions
    const totalScore = validScores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / validScores.length;
    
    return Math.round(averageScore * 100) / 100; // Round to 2 decimal places
  };

  // Calculate total assessment duration
  const calculateTotalDuration = () => {
    if (!assessmentStartTime || !assessmentEndTime) return 0;
    
    const start = new Date(assessmentStartTime);
    const end = new Date(assessmentEndTime);
    const durationMs = end - start;
    const durationMinutes = Math.round(durationMs / 60000); // Convert to minutes
    
    return durationMinutes;
  };

  // Legacy function for compatibility
  const calculateTotalScore = (results) => {
    const overallScore = calculateOverallScoreFromBackend(results);
    return overallScore > 0 ? `${overallScore}/100` : "Incomplete";
  };



  const currentQ = QUESTIONS[currentQuestion];

  return (
    <ExamBrowserMode
      isActive={examBrowserActive}
      onViolation={handleSecurityViolation}
      onModeChange={(isFullscreen) => console.log('Fullscreen mode:', isFullscreen)}
      strictMode={true}
      allowedKeys={[]} // No additional keys allowed
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        {/* Security Status Banner */}
        <div className="fixed top-0 left-0 right-0 bg-blue-800 text-white px-4 py-2 text-center text-sm font-medium z-40 shadow-lg">
          🔒 SECURE ASSESSMENT MODE - Violations: {securityViolations.length} • Question {currentQuestion + 1} of {QUESTIONS.length}
        </div>
        
        <div className="max-w-4xl w-full mt-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Question {currentQuestion + 1} of {QUESTIONS.length}</h1>
            <p className="text-gray-600">{currentQ.category}</p>
          </div>

          {/* Question Video (Scene 3, 5, or 7) */}
          {isScene3Playing && (
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-lg p-2 shadow-md">
                <video
                  ref={scene3VideoRef}
                  width="128"
                  height="72"
                  onPlay={handleScene3Start}
                  onEnded={handleScene3Ended}
                  className="rounded"
                >
                  <source src={getQuestionVideo(currentQuestion)} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Scene 4 Video (Transition after Question 1) */}
          {isScene4Playing && (
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-lg p-2 shadow-md">
                <video
                  ref={scene4VideoRef}
                  width="128"
                  height="72"
                  onPlay={handleScene4Start}
                  onEnded={handleScene4Ended}
                  className="rounded"
                  autoPlay
                >
                  <source src={Scene4Video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Scene 6 Video (Transition after Question 2) */}
          {isScene6Playing && (
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-lg p-2 shadow-md">
                <video
                  ref={scene6VideoRef}
                  width="128"
                  height="72"
                  onPlay={handleScene6Start}
                  onEnded={handleScene6Ended}
                  className="rounded"
                  autoPlay
                >
                  <source src={Scene6Video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Scene 8 Video (Transition after Question 3) */}
          {isScene8Playing && (
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-lg p-2 shadow-md">
                <video
                  ref={scene8VideoRef}
                  width="128"
                  height="72"
                  onPlay={handleScene8Start}
                  onEnded={handleScene8Ended}
                  className="rounded"
                  autoPlay
                >
                  <source src={Scene8Video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{currentQuestion + 1} / {QUESTIONS.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="bg-blue-50 p-6 rounded-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Question:</h2>
              <p className="text-gray-700 text-lg leading-relaxed">{currentQ.question}</p>
            </div>
          </div>

          {/* Timer and Recording Controls */}
          <div className="mb-8">
            {/* Visual Timer Display */}
            <div className="flex flex-col items-center mb-6">
              {/* Circular Timer */}
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={timerPhase === 'preparation' ? '#f59e0b' : timerPhase === 'recording' ? '#ef4444' : '#10b981'}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * (timeLeft / (timerPhase === 'preparation' ? QUESTIONS[currentQuestion].prepTime : QUESTIONS[currentQuestion].timeLimit)))}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                {/* Timer display in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${timerPhase === 'preparation' ? 'text-yellow-600' : timerPhase === 'recording' ? 'text-red-600' : 'text-green-600'}`}>
                      {formatTime(timeLeft)}
                    </div>
                    <div className={`text-xs font-medium ${timerPhase === 'preparation' ? 'text-yellow-500' : timerPhase === 'recording' ? 'text-red-500' : 'text-green-500'}`}>
                      {timerPhase === 'preparation' ? 'PREP' : timerPhase === 'recording' ? 'REC' : 'DONE'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Phase Status */}
              <div className="text-center">
                {timerPhase === 'preparation' && isPreparationActive && (
                  <div className="flex items-center justify-center space-x-2 text-yellow-600">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                    </svg>
                    <span className="font-semibold">Preparation Time</span>
                  </div>
                )}
                
                {timerPhase === 'recording' && isRecording && (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex items-center space-x-2 text-red-600">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">Recording in Progress</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="ml-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-semibold transition duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                      </svg>
                      Stop Recording
                    </button>
                  </div>
                )}
                
                {timerPhase === 'completed' && recordedAudio && (
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex items-center text-green-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold">Recording Complete</span>
                    </div>
                    <audio controls className="max-w-xs">
                      <source src={URL.createObjectURL(recordedAudio)} type="audio/webm" />
                    </audio>
                  </div>
                )}
                
                {!isPreparationActive && !isRecording && !recordedAudio && timerPhase === 'preparation' && (
                  <div className="text-center text-gray-500">
                    <p className="font-medium">Starting preparation timer...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {recordedAudio && !isProcessing && !isScene4Playing && !isScene6Playing && !isScene8Playing && (
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition duration-200"
                >
                  {/* {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Complete Assessment'} */}
                  {currentQuestion < QUESTIONS.length - 1 ? 'Submit' : 'Complete Assessment'}
                </button>
              )}

              
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">Processing your response...</span>
              </div>
            </div>
          )}

                     {/* Instructions */}
           <div className="mt-8 p-4 bg-blue-50 rounded-lg">
             <h3 className="font-semibold text-blue-800 mb-2">How This Works:</h3>
             <ul className="text-blue-700 text-sm space-y-1">
               <li>• <strong>Instruction Video:</strong> Watch the brief video first</li>
               <li>• <strong>Preparation (30s):</strong> Use this time to think about your answer (starts after video)</li>
               <li>• <strong>Recording (1min):</strong> Recording starts automatically after preparation</li>
               <li>• <strong>Early Stop:</strong> You can stop recording early using the stop button</li>
               <li>• <strong>Auto Stop:</strong> Recording stops automatically when time runs out</li>
               <li>• <strong>No Re-recording:</strong> Each question can only be recorded once</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
    </ExamBrowserMode>
  );
}