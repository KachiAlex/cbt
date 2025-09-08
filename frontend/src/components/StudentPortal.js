import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

const StudentPortal = ({ user, onLogout, onStartExam }) => {
  const [availableExams, setAvailableExams] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      const [exams, results] = await Promise.all([
        dataService.getExams(),
        dataService.getResultsByUser(user.id)
      ]);

      // Filter active exams
      const activeExams = exams.filter(exam => exam.isActive);
      setAvailableExams(activeExams);
      setUserResults(results);
      setLoading(false);
    } catch (error) {
      console.error('Error loading student data:', error);
      setLoading(false);
    }
  };

  const hasTakenExam = (examId) => {
    return userResults.some(result => result.examId === examId);
  };

  const getExamResult = (examId) => {
    return userResults.find(result => result.examId === examId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Portal</h1>
              <p className="text-gray-600">Welcome, {user?.fullName || user?.username}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Available Exams */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Available Exams</h3>
            
            {availableExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableExams.map((exam) => {
                  const hasTaken = hasTakenExam(exam.id);
                  const result = getExamResult(exam.id);
                  
                  return (
                    <div key={exam.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">{exam.title}</h4>
                        {hasTaken && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            result.score >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {result.score >= 70 ? 'Passed' : 'Failed'}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4">{exam.description}</p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium">{exam.duration} minutes</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Status:</span>
                          <span className="font-medium">
                            {hasTaken ? 'Completed' : 'Available'}
                          </span>
                        </div>
                        {hasTaken && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Score:</span>
                            <span className="font-medium">{result.score}%</span>
                          </div>
                        )}
                      </div>
                      
                      {exam.instructions && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Instructions:</h5>
                          <p className="text-sm text-gray-600">{exam.instructions}</p>
                        </div>
                      )}
                      
                      <div className="flex space-x-3">
                        {!hasTaken ? (
                          <button
                            onClick={() => onStartExam(exam)}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-center"
                          >
                            Start Exam
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed text-center"
                          >
                            Already Taken
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Available</h3>
                <p className="text-gray-500">There are currently no exams available for you to take.</p>
              </div>
            )}
          </div>
        </div>

        {/* Exam History */}
        {userResults.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Exam History</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userResults.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.examTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.score}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            result.score >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {result.score >= 70 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPortal;
