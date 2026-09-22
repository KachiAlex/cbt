import React from 'react';

const ExamResults = ({ 
  result, 
  questions, 
  onRetake, 
  onBackToDashboard,
  showDetailedAnalysis = true 
}) => {
  const { score, total, percent, timeTaken, answers, examTitle } = result;

  const getScoreColor = (percent) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percent) => {
    if (percent >= 80) return 'bg-green-50 border-green-200';
    if (percent >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getPerformanceMessage = (percent) => {
    if (percent >= 90) return "Outstanding! Excellent work! 🌟";
    if (percent >= 80) return "Great job! Well done! 👏";
    if (percent >= 70) return "Good work! Keep it up! 👍";
    if (percent >= 60) return "Not bad! Room for improvement. 📚";
    return "Keep studying! You can do better! 💪";
  };

  const getTimeAnalysis = () => {
    const avgTimePerQuestion = timeTaken / total;
    if (avgTimePerQuestion < 30) return "Very fast - you were efficient! ⚡";
    if (avgTimePerQuestion < 60) return "Good pace - well balanced! ⏱️";
    if (avgTimePerQuestion < 90) return "Steady pace - no rush needed! 🐌";
    return "Took your time - thorough approach! 🧠";
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getQuestionAnalysis = () => {
    if (!showDetailedAnalysis || !questions) return null;

    return questions.map((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correctIndex;
      
      return (
        <div key={index} className={`p-4 rounded-lg border ${
          isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </div>
          
          <p className="text-gray-700 mb-3">{question.text}</p>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-600">Your answer: </span>
              <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                {userAnswer !== -1 ? question.options[userAnswer] : 'Not answered'}
              </span>
            </div>
            
            {!isCorrect && (
              <div className="text-sm">
                <span className="font-medium text-gray-600">Correct answer: </span>
                <span className="text-green-700">{question.options[question.correctIndex]}</span>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Completed!</h1>
          <p className="text-gray-600">{examTitle}</p>
        </div>

        {/* Score Card */}
        <div className={`rounded-xl border-2 p-8 mb-8 ${getScoreBgColor(percent)}`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Your Score</h2>
            <div className={`text-6xl font-bold mb-2 ${getScoreColor(percent)}`}>
              {score}/{total}
            </div>
            <div className={`text-3xl font-semibold mb-4 ${getScoreColor(percent)}`}>
              {percent}%
            </div>
            <p className="text-lg text-gray-700 mb-6">
              {getPerformanceMessage(percent)}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{score}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total - score}</div>
              <div className="text-sm text-gray-600">Incorrect Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatTime(timeTaken)}</div>
              <div className="text-sm text-gray-600">Time Taken</div>
            </div>
          </div>
        </div>

        {/* Performance Analysis */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Accuracy Rate:</span>
                <span className="font-semibold">{percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Time per Question:</span>
                <span className="font-semibold">{formatTime(Math.round(timeTaken / total))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Analysis:</span>
                <span className="font-semibold text-sm">{getTimeAnalysis()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Recommendations</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {percent >= 80 ? (
                <>
                  <p>• Excellent performance! Keep up the great work!</p>
                  <p>• Consider helping classmates who might need support.</p>
                  <p>• You're ready for more challenging material.</p>
                </>
              ) : percent >= 60 ? (
                <>
                  <p>• Good effort! Review the incorrect answers.</p>
                  <p>• Focus on the topics you missed.</p>
                  <p>• Practice more questions in those areas.</p>
                </>
              ) : (
                <>
                  <p>• Review the study materials thoroughly.</p>
                  <p>• Focus on understanding concepts, not memorization.</p>
                  <p>• Consider seeking help from instructors.</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Question Analysis */}
        {showDetailedAnalysis && questions && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Question-by-Question Analysis</h3>
            <div className="space-y-4">
              {getQuestionAnalysis()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBackToDashboard}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Back to Dashboard
          </button>
          
          {onRetake && (
            <button
              onClick={onRetake}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Retake Exam
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Exam completed on {new Date(result.submittedAt).toLocaleDateString()} at {new Date(result.submittedAt).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ExamResults;
