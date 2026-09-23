import React, { useState, useEffect } from 'react';
import dataService from '../services/dataService';
import QuestionImportModal from './QuestionImportModal';
import QuestionImportGuide from './QuestionImportGuide';

const QuestionsManagement = ({ institution, onStatsUpdate }) => {
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [formData, setFormData] = useState({
    examId: '',
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    points: 1,
    difficulty: 'medium',
    rubricKeywords: '',
    minWords: 50,
    modelAnswer: ''
  });
  const selectedExamData = exams.find(exam => exam.id === formData.examId);
  const essayExam = String(selectedExamData?.type || '').toLowerCase() === 'essay';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [questionsData, examsData] = await Promise.all([
        dataService.getInstitutionQuestions(institution.id),
        dataService.getInstitutionExams(institution.id)
      ]);
      setQuestions(questionsData);
      setExams(examsData);
    } catch (error) {
      setError(error.message || 'Error loading questions.');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.examId) return setError('Select an exam first.');
    if (formData.type === 'essay' && !formData.rubricKeywords.trim() && !formData.modelAnswer.trim()) {
      return setError('Add rubric keywords or a model answer for essay scoring.');
    }
    if (formData.type === 'short-answer' && !String(formData.correctAnswer || '').trim()) {
      return setError('Enter the correct short answer.');
    }
    let normalizedOptions = [];
    let correctIndex = null;
    if (['multiple-choice', 'true-false'].includes(formData.type)) {
      const rawCorrectIndex = Number(formData.correctAnswer);
      formData.options.forEach((option, originalIndex) => {
        const normalizedOption = String(option || '').trim();
        if (!normalizedOption) return;
        if (originalIndex === rawCorrectIndex) correctIndex = normalizedOptions.length;
        normalizedOptions.push(normalizedOption);
      });
      if (normalizedOptions.length < 2 || correctIndex === null) return setError('Add at least two options and select the correct answer.');
    }
    const points = Number(formData.points);
    if (!Number.isFinite(points) || points <= 0) return setError('Question points must be greater than zero.');
    try {
      setLoading(true);

      const questionData = {
        ...formData,
        options: normalizedOptions,
        correctIndex,
        correctAnswer: formData.type === 'short-answer'
          ? String(formData.correctAnswer || '').trim()
          : correctIndex !== null ? normalizedOptions[correctIndex] : '',
        points,
        minWords: Number(formData.minWords) || 0,
        institutionId: institution.id,
        institutionName: institution.name,
        ...(editingQuestion ? {} : { createdAt: new Date().toISOString() })
      };

      if (editingQuestion) {
        await dataService.updateQuestion(editingQuestion.id, questionData);
      } else {
        await dataService.createQuestion(questionData);
      }

      await loadData();
      onStatsUpdate();
      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
    } catch (error) {
      setError(error.message || 'Error saving question.');
      console.error('Error saving question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    const exam = exams.find(item => item.id === question.examId);
    const options = question.options || ['', '', '', ''];
    const answerIndex = question.correctIndex != null
      ? Number(question.correctIndex)
      : options.findIndex(option => String(option).trim().toLowerCase() === String(question.correctAnswer || '').trim().toLowerCase());
    setFormData({
      examId: question.examId,
      question: question.question,
      type: String(exam?.type || '').toLowerCase() === 'essay' ? 'essay' : (question.type === 'essay' ? 'multiple-choice' : question.type),
      options,
      correctAnswer: answerIndex >= 0 ? String(answerIndex) : (['short-answer'].includes(question.type) ? question.correctAnswer || '' : ''),
      explanation: question.explanation,
      points: question.points,
      difficulty: question.difficulty,
      rubricKeywords: question.rubricKeywords || '',
      minWords: question.minWords || 50,
      modelAnswer: question.modelAnswer || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await dataService.deleteQuestion(questionId);
        await loadData();
        onStatsUpdate();
      } catch (error) {
        setError(error.message || 'Error deleting question.');
        console.error('Error deleting question:', error);
      }
    }
  };

  const handleImportQuestions = async (questionsToImport) => {
    try {
      setLoading(true);
      if (!selectedExam) {
        alert('Please select an exam to import questions into.');
        return;
      }
      
      await dataService.addQuestions(selectedExam, questionsToImport);
      await loadData();
      onStatsUpdate();
    } catch (error) {
      console.error('Error importing questions:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleClearQuestions = async () => {
    if (!selectedExam) {
      alert('Please select an exam first.');
      return;
    }
    if (!window.confirm('This will delete ALL questions for the selected exam. Continue?')) {
      return;
    }
    try {
      setLoading(true);
      await dataService.deleteQuestionsByExam(selectedExam);
      await loadData();
      onStatsUpdate();
    } catch (error) {
      setError(error.message || 'Error clearing questions.');
      console.error('Error clearing questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      examId: '',
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      points: 1,
      difficulty: 'medium',
      rubricKeywords: '',
      minWords: 50,
      modelAnswer: ''
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({ ...formData, options: [...formData.options, ''] });
  };

  const removeOption = (index) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    const answerIndex = Number(formData.correctAnswer);
    const correctAnswer = Number.isInteger(answerIndex)
      ? (answerIndex === index ? '' : answerIndex > index ? String(answerIndex - 1) : formData.correctAnswer)
      : '';
    setFormData({ ...formData, options: newOptions, correctAnswer });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select questions to delete.');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedQuestions.length} selected question(s)?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await dataService.deleteQuestions(selectedQuestions);
      setSelectedQuestions([]);
      await loadData();
      onStatsUpdate();
    } catch (error) {
      setError(error.message || 'Error deleting questions.');
      console.error('Error deleting questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case 'multiple-choice': return 'Multiple Choice';
      case 'true-false': return 'True/False';
      case 'short-answer': return 'Short Answer';
      case 'essay': return 'Essay';
      default: return type;
    }
  };

  const getDifficultyBadge = (difficulty = 'medium') => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };
    const level = colors[difficulty] ? difficulty : 'medium';
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[level]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  const filteredQuestions = selectedExam 
    ? questions.filter(q => q.examId === selectedExam)
    : questions;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Questions Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportGuide(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Import Guide
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            disabled={!selectedExam || loading}
            title={selectedExam ? 'Import questions into the selected exam' : 'Select an exam before importing'}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Import Questions
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Question
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={selectedQuestions.length === 0 || loading}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            Delete Selected ({selectedQuestions.length})
          </button>
          <button
            onClick={handleClearQuestions}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={!selectedExam || loading}
          >
            Clear Questions
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Filter */}
      <div className="mb-6">
        <select
          value={selectedExam}
          onChange={(e) => {
            setSelectedExam(e.target.value);
            setSelectedQuestions([]);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Exams</option>
          {exams.map(exam => (
            <option key={exam.id} value={exam.id}>{exam.title}</option>
          ))}
        </select>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filteredQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredQuestions.map((question) => (
              <tr key={question.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.id)}
                    onChange={() => handleSelectQuestion(question.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-md">
                    {(question.question || '').length > 100
                      ? `${question.question.substring(0, 100)}...` 
                      : question.question || 'Untitled question'
                    }
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getQuestionTypeLabel(question.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getDifficultyBadge(question.difficulty)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {question.points}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(question)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Exam
                  </label>
                  <select
                    required
                    value={formData.examId}
                    onChange={(e) => {
                      const selected = exams.find(exam => exam.id === e.target.value);
                      const isEssay = String(selected?.type || '').toLowerCase() === 'essay';
                      setFormData({ ...formData, examId: e.target.value, type: isEssay ? 'essay' : (formData.type === 'essay' ? 'multiple-choice' : formData.type) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an exam</option>
                    {exams.map(exam => (
                      <option key={exam.id} value={exam.id}>{exam.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {essayExam ? (
                      <option value="essay">Essay</option>
                    ) : (
                      <>
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="true-false">True/False</option>
                        <option value="short-answer">Short Answer</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question
                  </label>
                  <textarea
                    required
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your question here..."
                  />
                </div>

                {(formData.type === 'multiple-choice' || formData.type === 'true-false') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options
                    </label>
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Option ${index + 1}`}
                        />
                        <input
                          type="radio"
                          name="correctAnswer"
                          value={index}
                          checked={formData.correctAnswer === index.toString()}
                          onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                          className="h-4 w-4 text-blue-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {formData.type === 'short-answer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      value={formData.correctAnswer}
                      onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {formData.type === 'essay' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rubric Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.rubricKeywords}
                        onChange={(e) => setFormData({ ...formData, rubricKeywords: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., introduction, methodology, conclusion"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Word Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minWords}
                        onChange={(e) => setFormData({ ...formData, minWords: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model Answer (Optional)
                      </label>
                      <textarea
                        rows={4}
                        value={formData.modelAnswer}
                        onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Provide an ideal answer to help auto-scoring"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingQuestion(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingQuestion ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <QuestionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportQuestions}
        examId={selectedExam}
        institutionId={institution.id}
        institutionName={institution.name}
      />

      {/* Import Guide Modal */}
      <QuestionImportGuide
        isOpen={showImportGuide}
        onClose={() => setShowImportGuide(false)}
      />
    </div>
  );
};

export default QuestionsManagement;

