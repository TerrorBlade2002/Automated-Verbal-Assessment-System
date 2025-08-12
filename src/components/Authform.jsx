import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createUser, checkUserExists, checkUserHasTakenAssessment, getUserByEmail } from '../utils/firebaseUtils';

export default function AuthForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter both name and email.");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const emailExists = await checkUserExists('email', email.trim());

      if (emailExists) {
        const hasTakenAssessment = await checkUserHasTakenAssessment(email.trim());
        
        if (hasTakenAssessment) {
          setError("You have already taken the assessment. You cannot take it again.");
          toast.error("You have already taken the assessment. You cannot take it again.");
          setIsLoading(false);
          return;
        }

        // Only check localStorage termination if user has actually taken an assessment
        // This prevents blocking users who registered but never started the test
        const terminated = localStorage.getItem('assessment_terminated');
        if (terminated && hasTakenAssessment) {
          try {
            const terminationData = JSON.parse(terminated);
            if (terminationData.email === email.trim()) {
              setError("Your assessment was terminated due to navigation violation. You cannot attempt again.");
              toast.error("Your assessment was terminated due to navigation violation. You cannot attempt again.");
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing termination data:', error);
          }
        }

        // User exists but hasn't taken assessment, allow them to proceed
        const userResult = await getUserByEmail(email.trim());
        
        if (userResult.success) {
          // Clear any stale termination data for users who haven't taken assessment
          localStorage.removeItem('assessment_terminated');
          
          toast.success("Welcome back! Redirecting to test selection...");
          navigate("/select-test", { 
            state: { 
              name: userResult.user.name, 
              email: userResult.user.email,
              userId: userResult.user.id 
            } 
          });
        } else {
          throw new Error("Failed to retrieve user data");
        }
        setIsLoading(false);
        return;
      }

      // Create new user (duplicate names are allowed, only emails must be unique)
      const userData = {
        name: name.trim(),
        email: email.trim()
      };
      
      const result = await createUser(userData);
      
      if (result.success) {
        toast.success("Registration successful! Redirecting to test selection...");
        navigate("/select-test", { 
          state: { 
            name: name.trim(), 
            email: email.trim(),
            userId: result.userId 
          } 
        });
      } else {
        throw new Error(result.error);
      }

    } catch (err) {
      console.error("Firebase error:", err);
      setError(`Something went wrong: ${err.message}`);
      toast.error(`Something went wrong: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h1>
            <p className="text-gray-600">Enter your details to begin the test</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className={`
                w-full py-3 px-4 rounded-lg font-semibold text-white transition duration-200
                ${isLoading || !name.trim() || !email.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }
              `}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Begin Test'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Your information will be securely stored and used only for test purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}