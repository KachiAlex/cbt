import React, { useEffect, useRef } from 'react';

const EnhancedQuestion = ({ 
  question, 
  questionNumber, 
  totalQuestions,
  selectedAnswer, 
  onAnswerSelect,
  isAnswered,
  className = ""
}) => {
  const optionRefs = useRef([]);

  // Focus management for accessibility
  useEffect(() => {
    if (selectedAnswer !== -1 && optionRefs.current[selectedAnswer]) {
      optionRefs.current[selectedAnswer].focus();
    }
  }, [selectedAnswer]);

  const handleKeyPress = (e, optionIndex) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAnswerSelect(optionIndex);
    }
  };

  const getOptionLabel = (index) => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    return labels[index] || String.fromCharCode(65 + index);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {/* Question Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
            Question {questionNumber}
          </div>
          <div className="text-sm text-gray-500">
            {questionNumber} of {totalQuestions}
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isAnswered 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isAnswered ? '✅ Answered' : '⭕ Not answered'}
        </div>
      </div>

      {/* Question Text */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 leading-relaxed">
          {question.text}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3" role="radiogroup" aria-label={`Question ${questionNumber} options`}>
        {question.options.map((option, index) => (
          <label
            key={index}
            className={`block p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedAnswer === index
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            htmlFor={`option-${questionNumber}-${index}`}
          >
            <input
              ref={el => optionRefs.current[index] = el}
              type="radio"
              id={`option-${questionNumber}-${index}`}
              name={`question-${questionNumber}`}
              value={index}
              checked={selectedAnswer === index}
              onChange={() => onAnswerSelect(index)}
              onKeyDown={(e) => handleKeyPress(e, index)}
              className="sr-only"
              aria-describedby={`option-${questionNumber}-${index}-text`}
            />
            
            <div className="flex items-start">
              {/* Option Letter */}
              <div className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                selectedAnswer === index
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 text-gray-600'
              }`}>
                {getOptionLabel(index)}
              </div>
              
              {/* Option Text */}
              <div 
                id={`option-${questionNumber}-${index}-text`}
                className="text-gray-800 leading-relaxed flex-1"
              >
                {option}
              </div>
              
              {/* Selection Indicator */}
              {selectedAnswer === index && (
                <div className="ml-3 flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <span className="font-medium">Keyboard shortcuts:</span> Press 1-{question.options.length} to select options, or use Tab to navigate
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuestion;
