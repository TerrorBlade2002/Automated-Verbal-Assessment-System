import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Routes, Route } from 'react-router-dom';
import AuthForm from './components/Authform';
import TestSelection from './components/TestSelection';
import AssessmentStart from './components/AssessmentStart';
import MicCheck from './components/MicCheck';
import AssessmentGuidelines from './components/AssessmentGuidelines';
import ExamBrowserIntro from './components/ExamBrowserIntro';
import VideoInstructions from './components/VideoInstructions';
import FullscreenEntry from './components/FullscreenEntry';
import AssessmentQuestions from './components/AssessmentQuestions';
import AssessmentResults from './components/AssessmentResults';
import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthForm />} />
      <Route path="/select-test" element={<TestSelection />} />
      <Route path="/assessment-start" element={<AssessmentStart />} />
      <Route path="/mic-check" element={<MicCheck />} />
      <Route path="/assessment-guidelines" element={<AssessmentGuidelines />} />
      <Route path="/exam-browser-intro" element={<ExamBrowserIntro />} />
      <Route path="/video-instructions" element={<VideoInstructions />} />
      <Route path="/fullscreen-entry" element={<FullscreenEntry />} />
      <Route path="/assessment-questions" element={<AssessmentQuestions />} />
      <Route path="/assessment-results" element={<AssessmentResults />} />
      {/* More routes coming later */}
    </Routes>
  );
}
