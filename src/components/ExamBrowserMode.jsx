import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

/**
 * ExamBrowserMode - Professional Lockdown Component
 * 
 * Provides:
 * - Fullscreen lockdown with Keyboard Lock API
 * - Enhanced security monitoring
 * - Professional exam browser experience
 * - Multiple violation detection systems
 */

const ExamBrowserMode = ({ 
  isActive, 
  onViolation, 
  onModeChange, 
  children,
  allowedKeys = [],
  strictMode = true 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKeyboardLocked, setIsKeyboardLocked] = useState(false);
  const [violations, setViolations] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [isSupported, setIsSupported] = useState({
    fullscreen: false,
    keyboardLock: false,
    pointerLock: false
  });
  const [isInitializing, setIsInitializing] = useState(false);  // Track initialization phase
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);  // Track if fullscreen was ever successfully entered

  const containerRef = useRef(null);
  const violationTimeoutRef = useRef(null);
  const focusCheckIntervalRef = useRef(null);
  const escPressedAtRef = useRef(0);

  // ESC key detection helpers
  const markEscPressed = () => {
    escPressedAtRef.current = Date.now();
  };

  const wasEscJustPressed = (windowMs = 800) => {
    const delta = Date.now() - escPressedAtRef.current;
    return delta >= 0 && delta <= windowMs;
  };

  // Feature Detection
  useEffect(() => {
    const checkSupport = () => {
      const support = {
        fullscreen: !!(
          document.fullscreenEnabled ||
          document.webkitFullscreenEnabled ||
          document.mozFullScreenEnabled ||
          document.msFullscreenEnabled
        ),
        keyboardLock: !!(navigator.keyboard && navigator.keyboard.lock),
        pointerLock: !!(document.pointerLockElement !== undefined)
      };
      
      setIsSupported(support);
      
      // Get device information
      setDeviceInfo({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: screen.width,
        screenHeight: screen.height,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      });
    };

    checkSupport();
  }, []);

  // Violation Handler
  const reportViolation = (type, details) => {
    const violation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    setViolations(prev => [...prev, violation]);
    
    if (onViolation) {
      onViolation(violation);
    }

    // Show appropriate warning based on violation type
    switch (type) {
      case 'fullscreen_exit':
        toast.error('🚨 VIOLATION: Exited fullscreen mode!');
        break;
      case 'focus_loss':
        toast.warning('⚠️ WARNING: Window focus lost!');
        break;
      case 'tab_switch':
        toast.error('🚨 VIOLATION: Tab switching detected!');
        break;
      case 'dev_tools':
        toast.error('🚨 VIOLATION: Developer tools detected!');
        break;
      case 'copy_paste':
        toast.warning('⚠️ WARNING: Copy/paste attempt blocked!');
        break;
      case 'print':
        toast.error('🚨 VIOLATION: Print attempt blocked!');
        break;
      case 'screenshot':
        toast.error('🚨 VIOLATION: Screenshot attempt detected!');
        break;
      default:
        toast.warning(`⚠️ WARNING: ${type}`);
    }
  };

  // Fullscreen Management
  const enterFullscreen = async () => {
    if (!containerRef.current || !isSupported.fullscreen) {
      console.error('Fullscreen not supported:', { 
        hasContainer: !!containerRef.current, 
        supported: isSupported.fullscreen 
      });
      toast.error('Fullscreen mode not supported on this browser');
      return false;
    }

    try {
      console.log('Attempting to request fullscreen...');
      
      // Check for user activation requirement
      if (!document.hasFocus()) {
        console.warn('Document does not have focus, fullscreen may fail');
      }
      
      // Request fullscreen with user gesture validation
      let fullscreenPromise;
      if (containerRef.current.requestFullscreen) {
        fullscreenPromise = containerRef.current.requestFullscreen({ navigationUI: "hide" });
        console.log('Fullscreen requested via requestFullscreen');
      } else if (containerRef.current.webkitRequestFullscreen) {
        fullscreenPromise = containerRef.current.webkitRequestFullscreen();
        console.log('Fullscreen requested via webkitRequestFullscreen');
      } else if (containerRef.current.mozRequestFullScreen) {
        fullscreenPromise = containerRef.current.mozRequestFullScreen();
        console.log('Fullscreen requested via mozRequestFullScreen');
      } else if (containerRef.current.msRequestFullscreen) {
        fullscreenPromise = containerRef.current.msRequestFullscreen();
        console.log('Fullscreen requested via msRequestFullscreen');
      } else {
        console.error('No fullscreen method available');
        return false;
      }

      // Handle the promise if it exists
      if (fullscreenPromise && fullscreenPromise.then) {
        await fullscreenPromise;
      }

      console.log('Fullscreen request completed');
      return true;
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      
      // Handle specific permission errors
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        toast.error('Fullscreen permission denied. Please allow fullscreen and try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Permissions check failed')) {
        toast.warning('Please click the fullscreen button directly to enable fullscreen mode.');
      } else {
        toast.error(`Failed to enter fullscreen mode: ${error.message}`);
      }
      return false;
    }
  };

  const exitFullscreen = async () => {
    // Check if we're actually in fullscreen before trying to exit
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      console.log('Not in fullscreen, skipping exit');
      return;
    }

    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen && document.mozFullScreenElement) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen && document.msFullscreenElement) {
        await document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      // Don't throw error, just log it as it's often not critical
    }
  };

  // Keyboard Lock Management
  const lockKeyboard = async () => {
    if (!isSupported.keyboardLock) {
      console.warn('Keyboard Lock API not supported');
      return false;
    }

    try {
      // Lock specific keys that we want to capture
      const keysToLock = [
        'Escape',
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
        'Tab',
        'MetaLeft', 'MetaRight', // Windows/Cmd keys
        'AltLeft', 'AltRight',
        'ControlLeft', 'ControlRight',
        ...allowedKeys
      ];

      await navigator.keyboard.lock(keysToLock);
      setIsKeyboardLocked(true);
      console.log('Keyboard locked');
      return true;
    } catch (error) {
      console.error('Failed to lock keyboard:', error);
      return false;
    }
  };

  const unlockKeyboard = () => {
    if (isSupported.keyboardLock && navigator.keyboard.unlock) {
      navigator.keyboard.unlock();
      setIsKeyboardLocked(false);
      console.log('Keyboard unlocked');
    }
  };

  // Enhanced Event Handlers
  const handleKeyDown = (e) => {
    // NEW: catch plain Esc (some browsers still exit fullscreen anyway)
    if (e.key === 'Escape') {
      markEscPressed();
      e.preventDefault();
      e.stopPropagation();
      reportViolation('esc_pressed', {
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
      // Don't return yet—let the rest of the checks run for combos
    }

    // Block dangerous key combinations
    const blockedCombinations = [
      // Developer tools
      { key: 'F12' },
      { key: 'I', ctrl: true, shift: true }, // Chrome DevTools
      { key: 'J', ctrl: true, shift: true }, // Chrome Console
      { key: 'C', ctrl: true, shift: true }, // Chrome DevTools
      { key: 'U', ctrl: true }, // View Source
      
      // Navigation
      { key: 'R', ctrl: true }, // Refresh
      { key: 'F5' }, // Refresh
      { key: 'W', ctrl: true }, // Close tab
      { key: 'T', ctrl: true }, // New tab
      { key: 'N', ctrl: true }, // New window
      { key: 'L', ctrl: true }, // Address bar
      
      // System shortcuts
      { key: 'Tab', alt: true }, // Alt+Tab
      { key: 'Escape', alt: true }, // Alt+Escape
      { key: 'D', meta: true }, // Show desktop (Mac)
      { key: 'M', meta: true }, // Minimize (Mac)
      
      // Copy/Paste (if not allowed)
      ...(strictMode ? [
        { key: 'C', ctrl: true },
        { key: 'V', ctrl: true },
        { key: 'X', ctrl: true },
        { key: 'A', ctrl: true },
        { key: 'P', ctrl: true }, // Print
        { key: 'S', ctrl: true }, // Save
      ] : [])
    ];

    const isBlocked = blockedCombinations.some(combo => {
      return e.key === combo.key && 
             (!combo.ctrl || e.ctrlKey) && 
             (!combo.shift || e.shiftKey) && 
             (!combo.alt || e.altKey) && 
             (!combo.meta || e.metaKey);
    });

    if (isBlocked) {
      e.preventDefault();
      e.stopPropagation();
      
      reportViolation('blocked_shortcut', {
        key: e.key,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
      
      return false;
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    reportViolation('context_menu', { x: e.clientX, y: e.clientY });
    return false;
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      reportViolation('tab_switch', { 
        hidden: true,
        visibilityState: document.visibilityState 
      });
    }
  };

  const handleFullscreenChange = () => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    console.log('Fullscreen change detected:', {
      isCurrentlyFullscreen,
      isActive,
      isInitializing,
      fullscreenElement: document.fullscreenElement,
      webkitFullscreenElement: document.webkitFullscreenElement
    });

    setIsFullscreen(isCurrentlyFullscreen);
    if (isCurrentlyFullscreen && !hasEnteredFullscreen) {
      setHasEnteredFullscreen(true);
    }

    console.log('Fullscreen violation check:', {
      isActive,
      isCurrentlyFullscreen,
      isInitializing,
      shouldReportViolation: isActive && !isCurrentlyFullscreen && !isInitializing
    });

    // Only treat as violation when active, previously entered, and not initializing
    const shouldCheckViolation = isActive && hasEnteredFullscreen && !isInitializing;

    if (shouldCheckViolation && !isCurrentlyFullscreen) {
      // NEW: if Esc was pressed shortly before the exit, treat as intentional exit -> terminate
      if (wasEscJustPressed(800)) {
        console.log('ESC key detected before fullscreen exit - terminating assessment...');
        reportViolation('esc_exit_terminate', { exitTime: new Date().toISOString() });

        // Stop trying to re-enter
        // Do whatever you consider "terminate & count" here:
        //  - notify parent via onViolation (already done)
        //  - flip mode off
        if (onModeChange) onModeChange(false);

        // Clear the marker so we don't double-handle
        escPressedAtRef.current = 0;
        return; // IMPORTANT: don't attempt re-enter
      }

      // Fallback: non-Esc fullscreen exit -> treat as violation and try to re-enter
      console.log('Detected unauthorized fullscreen exit, reporting violation...');
      reportViolation('fullscreen_exit', {
        exitTime: new Date().toISOString()
      });
      
      // Attempt to re-enter fullscreen after a short delay
      console.log('Attempting to re-enter fullscreen...');
      setTimeout(() => {
        if (isActive && !isInitializing) {
          enterFullscreen();
        }
      }, 100);
    } else if (isCurrentlyFullscreen && isInitializing) {
      // Successfully entered fullscreen during initialization
      console.log('Successfully entered fullscreen during initialization');
      setIsInitializing(false);  // Clear initialization flag
      setHasEnteredFullscreen(true);
    } else if (isCurrentlyFullscreen && !isInitializing) {
      // Successfully re-entered fullscreen after a violation
      console.log('Successfully re-entered fullscreen after violation');
    } else if (!isCurrentlyFullscreen && isInitializing) {
      // Still in initialization phase, not a violation
      console.log('Fullscreen change during initialization - not a violation');
    }

    if (onModeChange) {
      onModeChange(isCurrentlyFullscreen);
    }
  };

  const handleBlur = () => {
    if (isActive) {
      reportViolation('focus_loss', {
        activeElement: document.activeElement?.tagName
      });
    }
  };

  // Focus monitoring
  useEffect(() => {
    if (isActive) {
      focusCheckIntervalRef.current = setInterval(() => {
        if (!document.hasFocus()) {
          reportViolation('focus_loss', { 
            reason: 'periodic_check',
            focused: document.hasFocus()
          });
        }
      }, 1000);
    } else {
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
      }
    }

    return () => {
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
      }
    };
  }, [isActive]);

  // Main Effect - Manage Exam Browser Mode
  useEffect(() => {
    if (isActive) {
      // Set initialization flag IMMEDIATELY when mode becomes active
      setIsInitializing(true);
      console.log('Setting initialization flag to true');
      
      // Enter exam browser mode
      const initializeExamMode = async () => {
        console.log('Initializing exam browser mode...');
        
        // Check if we're already in fullscreen
        const alreadyFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        if (alreadyFullscreen) {
          console.log('Already in fullscreen, proceeding with setup...');
          setIsFullscreen(true);
          setIsInitializing(false);  // Clear initialization flag
          await lockKeyboard();
          toast.success('🔒 Exam Browser Mode Activated');
        } else {
          // Try to enter fullscreen
          console.log('Attempting to enter fullscreen...');
          const fullscreenSuccess = await enterFullscreen();
          
          if (fullscreenSuccess) {
            // Wait a moment for fullscreen to be established
            setTimeout(async () => {
              await lockKeyboard();
              toast.success('🔒 Exam Browser Mode Activated');
              // Note: initialization flag will be cleared in handleFullscreenChange when fullscreen is established
            }, 100);
          } else {
            console.error('Failed to enter fullscreen');
            setIsInitializing(false);  // Clear initialization flag on failure
      setHasEnteredFullscreen(false);
            toast.error('Failed to activate Exam Browser Mode. Please allow fullscreen permissions and try again.');
            // Deactivate exam browser mode since fullscreen failed
            if (onModeChange) {
              onModeChange(false);
            }
            return;
          }
        }
      };

      // Add event listeners BEFORE initializing to catch all events
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('msfullscreenchange', handleFullscreenChange);
      window.addEventListener('blur', handleBlur);

      // Initialize immediately after event listeners are set
      setTimeout(initializeExamMode, 10);
      
      // Safety timeout to clear initialization flag in case something goes wrong
      setTimeout(() => {
        if (isInitializing) {
          console.warn('Initialization timeout reached, clearing flag');
          setIsInitializing(false);
        }
      }, 5000);  // 5 second timeout

    } else {
      // Exit exam browser mode - do cleanup without forcing fullscreen exit
      console.log('Deactivating exam browser mode...');
      
      // Clear initialization flag
      setIsInitializing(false);
      
      // Unlock keyboard first
      unlockKeyboard();
      
      // Remove event listeners
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      
      // Only try to exit fullscreen if we're actually in fullscreen and document is active
      const isInFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      
      if (isInFullscreen && !document.hidden) {
        exitFullscreen().catch(error => {
          console.log('Could not exit fullscreen gracefully:', error.message);
        });
      }
      
      toast.info('🔓 Exam Browser Mode Deactivated');
    }

    return () => {
      // Cleanup
      setIsInitializing(false);  // Clear initialization flag
      setHasEnteredFullscreen(false);
      unlockKeyboard;
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, strictMode]);

  if (!isActive) {
    return children;
  }

  return (
    <div 
      ref={containerRef}
      className="exam-browser-container w-full h-screen bg-gray-900 overflow-hidden"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999
      }}
    >
      {/* Exam Browser Header */}
      <div className="bg-red-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-lg font-bold">🔒 SECURE EXAM MODE</span>
          <div className="flex items-center space-x-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${isFullscreen ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span>Fullscreen: {isFullscreen ? 'Active' : 'Inactive'}</span>
            <span className={`w-2 h-2 rounded-full ${isKeyboardLocked ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
            <span>Keyboard: {isKeyboardLocked ? 'Locked' : 'Unlocked'}</span>
          </div>
        </div>
        <div className="text-sm">
          Violations: {violations.length}
        </div>
      </div>

      {/* Exam Content Area */}
      <div className="h-full bg-white overflow-auto" style={{ height: 'calc(100vh - 48px)' }}>
        {children}
      </div>

      {/* Security Overlay - Shows when not in fullscreen */}
      {!isFullscreen && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center text-white p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-4">Secure Exam Mode Required</h2>
            <p className="text-lg mb-6">
              This assessment requires fullscreen mode for security.
              <br />
              Please allow fullscreen access to continue.
            </p>
            <button
              onClick={enterFullscreen}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Enter Fullscreen Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamBrowserMode;