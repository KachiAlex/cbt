import React from 'react';

const ExamNavigation = ({ 
  questions, 
  currentQuestion, 
  answers, 
  onQuestionSelect, 
  onPrevious, 
  onNext,
  onReview,
  onSubmit,
  canGoPrevious,
  canGoNext 
}) => {
  const getAnsweredCount = () => {
    return answers.filter(answer => answer !== -1).length;
  };

  const getProgressPercentage = () => {
    return Math.round(((currentQuestion + 1) / questions.length) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Navigation</h3>
        <div className="text-sm text-gray-600">
          {getAnsweredCount()}/{questions.length} answered
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{getProgressPercentage()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {questions.map((_, index) => (
          <button
            key={index}
            onClick={() => onQuestionSelect(index)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
              index === currentQuestion
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : answers[index] !== -1
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
            }`}
            title={`Question ${index + 1}${answers[index] !== -1 ? ' (Answered)' : ''}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-600 mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
          <span>Current</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
          <span>Answered</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-1"></div>
          <span>Not answered</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          ← Previous
        </button>

        <div className="flex space-x-2">
          <button
            onClick={onReview}
            className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Review
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Submit
          </button>
        </div>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ExamNavigation;
