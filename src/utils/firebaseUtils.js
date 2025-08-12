import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// User Management Functions
export const createUser = async (userData) => {
  try {
    const usersRef = collection(db, 'users');
    const docRef = await addDoc(usersRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, userId: docRef.id };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

export const checkUserExists = async (field, value) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(field, '==', value));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { success: true, user: { id: doc.id, ...doc.data() } };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error: error.message };
  }
};

// Assessment Results Functions
export const createFinalAssessment = async (assessmentData, status = 'completed') => {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const docRef = await addDoc(assessmentsRef, {
      ...assessmentData,
      status: status, // 'completed' or 'failed'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, assessmentId: docRef.id };
  } catch (error) {
    console.error('Error creating final assessment:', error);
    return { success: false, error: error.message };
  }
};


export const updateAssessment = async (assessmentId, assessmentData) => {
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    await updateDoc(assessmentRef, {
      ...assessmentData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating assessment:', error);
    return { success: false, error: error.message };
  }
};

export const completeAssessmentOnRefresh = async (assessmentId) => {
  try {
    const assessmentRef = doc(db, 'assessments', assessmentId);
    await updateDoc(assessmentRef, {
      status: 'completed',
      failureReason: 'User refreshed or closed the page.',
      overallScore: 0,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error completing assessment on refresh:', error);
    return { success: false, error: error.message };
  }
};


export const saveAssessmentResult = async (assessmentData) => {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const docRef = await addDoc(assessmentsRef, {
      ...assessmentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, assessmentId: docRef.id };
  } catch (error) {
    console.error('Error saving assessment result:', error);
    return { success: false, error: error.message };
  }
};

export const checkUserHasTakenAssessment = async (email) => {
  try {
    const assessmentsRef = collection(db, 'assessments');
    // Check for both completed and failed assessments
    const q = query(assessmentsRef, where('user_id', '==', email), where('status', 'in', ['completed', 'failed']));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if user has taken assessment:', error);
    return false; 
  }
};

export const getAssessmentResults = async (userId) => {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(
      assessmentsRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const results = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, results };
  } catch (error) {
    console.error('Error getting assessment results:', error);
    return { success: false, error: error.message };
  }
};

export const getAllAssessmentResults = async () => {
  try {
    const assessmentsRef = collection(db, 'assessments');
    const q = query(assessmentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const results = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, results };
  } catch (error) {
    console.error('Error getting all assessment results:', error);
    return { success: false, error: error.message };
  }
};

// Data Structure Examples
export const assessmentDataStructure = {
  userId: 'string', // User ID from users collection
  userName: 'string', // User's name
  userEmail: 'string', // User's email
  questions: [
    {
      questionNumber: 1,
      question: 'string',
      audioUrl: 'string', // URL to stored audio file
      scores: {
        pronunciation: 85,
        fluency: 90,
        clarity: 88,
        confidence: 92,
        overall: 89
      },
      transcription: 'string',
      duration: 45, // seconds
      wordCount: 25
    }
  ],
  overallScore: 89,
  completedAt: 'timestamp',
  status: 'completed' // 'completed' or 'failed'
};