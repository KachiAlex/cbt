import React, { useEffect, useState } from 'react';

const ExamTimer = ({ 
  timeLeft, 
  totalTime, 
  onTimeUp, 
  showWarning = true,
  className = "" 
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [warningLevel, setWarningLevel] = useState('normal');

  useEffect(() => {
    // Determine warning level
    if (timeLeft <= 60) {
      setWarningLevel('critical');
      setIsBlinking(true);
    } else if (timeLeft <= 300) { // 5 minutes
      setWarningLevel('danger');
      setIsBlinking(false);
    } else if (timeLeft <= 600) { // 10 minutes
      setWarningLevel('warning');
      setIsBlinking(false);
    } else {
      setWarningLevel('normal');
      setIsBlinking(false);
    }

    // Auto-submit when time runs out
    if (timeLeft === 0) {
      onTimeUp && onTimeUp();
    }
  }, [timeLeft, onTimeUp]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  };

  const getTimerStyles = () => {
    const baseStyles = "px-4 py-2 rounded-lg font-mono text-lg font-bold transition-all duration-300";
    
    switch (warningLevel) {
      case 'critical':
        return `${baseStyles} bg-red-600 text-white ${isBlinking ? 'animate-pulse' : ''}`;
      case 'danger':
        return `${baseStyles} bg-red-100 text-red-800 border-2 border-red-300`;
      case 'warning':
        return `${baseStyles} bg-yellow-100 text-yellow-800 border-2 border-yellow-300`;
      default:
        return `${baseStyles} bg-green-100 text-green-800 border-2 border-green-300`;
    }
  };

  const getWarningMessage = () => {
    if (!showWarning) return null;

    switch (warningLevel) {
      case 'critical':
        return (
          <div className="text-red-600 text-sm font-semibold animate-pulse">
            ⚠️ Time is almost up! Submit your exam now!
          </div>
        );
      case 'danger':
        return (
          <div className="text-red-600 text-sm">
            ⚠️ Less than 5 minutes remaining
          </div>
        );
      case 'warning':
        return (
          <div className="text-yellow-600 text-sm">
            ⏰ Less than 10 minutes remaining
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Progress Circle */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${
                warningLevel === 'critical' ? 'text-red-600' :
                warningLevel === 'danger' ? 'text-red-500' :
                warningLevel === 'warning' ? 'text-yellow-500' :
                'text-green-500'
              }`}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${getProgressPercentage()}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-600">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-right">
          <div className={getTimerStyles()}>
            {formatTime(timeLeft)}
          </div>
          {getWarningMessage()}
        </div>
      </div>

      {/* Time Breakdown */}
      <div className="text-xs text-gray-500 mt-1">
        {timeLeft > 3600 && (
          <span>{Math.floor(timeLeft / 3600)}h </span>
        )}
        {timeLeft > 60 && (
          <span>{Math.floor((timeLeft % 3600) / 60)}m </span>
        )}
        <span>{timeLeft % 60}s remaining</span>
      </div>
    </div>
  );
};

export default ExamTimer;
