import React from 'react';

const QuestionImportGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Question Import Format Guide</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Excel Format */}
            <div className="border rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">📊 Excel Format (.xlsx, .xls)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Flexible Column Names</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Question:</strong> Question, Q, Question Text, Question Text, Text, Content</p>
                    <p><strong>Type:</strong> Type, Question Type, Question Type, QType, Format</p>
                    <p><strong>Options:</strong> Options, Choices, Answers, Alternatives, Option A, Option B, Option C, Option D</p>
                    <p><strong>Correct Answer:</strong> Correct, Answer, Correct Answer, Correct Answer, Right Answer, Solution</p>
                    <p><strong>Explanation:</strong> Explanation, Explain, Reason, Rationale, Why</p>
                    <p><strong>Points:</strong> Points, Score, Marks, Weight, Value</p>
                    <p><strong>Difficulty:</strong> Difficulty, Level, Complexity, Hardness</p>
                    <p><strong>Category:</strong> Category, Subject, Topic, Chapter, Section</p>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Example Format</h5>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Question | Type | Option A | Option B | Option C | Option D | Correct | Points</div>
                    <div>What is 2+2? | Multiple Choice | 3 | 4 | 5 | 6 | B | 1</div>
                    <div>The sky is blue | True/False | True | False | | | B | 1</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">Question Types (Auto-detected)</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="bg-blue-50 p-2 rounded">
                    <strong>Multiple Choice:</strong> Multiple Choice, MCQ, Choice, Multiple-choice
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>True/False:</strong> True/False, True-False, T/F, TF
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <strong>Short Answer:</strong> Short Answer, Short-answer, SA
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <strong>Essay:</strong> Essay, Long Answer, Written
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">Difficulty Levels</h5>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-green-50 p-2 rounded">Easy: Easy, E, 1, Simple</div>
                  <div className="bg-yellow-50 p-2 rounded">Medium: Medium, M, 2, Moderate</div>
                  <div className="bg-red-50 p-2 rounded">Hard: Hard, H, 3, Difficult, Complex</div>
                </div>
              </div>
            </div>

            {/* Word Format */}
            <div className="border rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">📝 Word Format (.docx, .doc)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Question Patterns</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Numbered:</strong> Q1., Question 1., 1., 1)</p>
                    <p><strong>With separators:</strong> Q1-, Question 1-, 1-</p>
                    <p><strong>Flexible spacing:</strong> Any amount of spaces or tabs</p>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Option Patterns</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>With periods:</strong> A), B), C), D)</p>
                    <p><strong>With dots:</strong> A., B., C., D.</p>
                    <p><strong>With dashes:</strong> A-, B-, C-, D-</p>
                    <p><strong>With spaces:</strong> A B C D</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">Example Format</h5>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                  <div>Q1. What is the capital of France?</div>
                  <div>A) London</div>
                  <div>B) Berlin</div>
                  <div>C) Paris</div>
                  <div>D) Madrid</div>
                  <div>Answer: C</div>
                  <div>Explanation: Paris is the capital of France.</div>
                  <div>Points: 1</div>
                  <div>Difficulty: Easy</div>
                  <div>Type: Multiple Choice</div>
                </div>
              </div>
            </div>

            {/* Advanced Features */}
            <div className="border rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">🚀 Advanced Features</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Flexible Parsing</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Case-insensitive matching</li>
                    <li>• Multiple format support</li>
                    <li>• Auto-correction of common errors</li>
                    <li>• Support for mixed formats</li>
                    <li>• Empty cell handling</li>
                    <li>• Special character support</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Error Handling</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Invalid questions are highlighted</li>
                    <li>• Preview before import</li>
                    <li>• Detailed error messages</li>
                    <li>• Partial import support</li>
                    <li>• Validation feedback</li>
                    <li>• Rollback capability</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">💡 Pro Tips</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h5 className="font-medium mb-2">For Excel:</h5>
                  <ul className="space-y-1">
                    <li>• Use consistent column headers</li>
                    <li>• Keep options in separate columns for best results</li>
                    <li>• Use standard question types for auto-detection</li>
                    <li>• Include explanations for better learning</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">For Word:</h5>
                  <ul className="space-y-1">
                    <li>• Use consistent numbering format</li>
                    <li>• Keep options aligned (A), B), C), D))</li>
                    <li>• Add Answer: and Explanation: labels</li>
                    <li>• Use line breaks between questions</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionImportGuide;
