import React, { useState, useEffect } from 'react';
import dataService from '../services/dataService';
import QuestionImportModal from './QuestionImportModal';
import QuestionImportGuide from './QuestionImportGuide';

const QuestionsManagement = ({ institution, onStatsUpdate }) => {
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mode, setMode] = useState('exam'); // 'exam' | 'bank'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [attachSelection, setAttachSelection] = useState([]);
  const [saveToBank, setSaveToBank] = useState(false);
  const [formData, setFormData] = useState({
    examId: '',
    subjectId: '',
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
  const essayExam = mode === 'exam' && String(selectedExamData?.type || '').toLowerCase() === 'essay';
  const attachExam = exams.find(exam => exam.id === selectedExam);
  const subjectsById = new Map(subjects.map(subject => [subject.id, subject]));
  // Bank questions available to attach to the filtered exam — scoped to the exam's subject
  // and constrained to question types the exam accepts (essay exams take only essays).
  const attachExamIsEssay = String(attachExam?.type || '').toLowerCase() === 'essay';
  const attachableQuestions = questions.filter(
    q => !q.examId
      && (!attachExam?.subjectId || q.subjectId === attachExam.subjectId)
      && (!attachExam || (String(q.type || 'multiple-choice').toLowerCase() === 'essay') === attachExamIsEssay)
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [questionsData, examsData, subjectsData] = await Promise.all([
        dataService.getInstitutionQuestions(institution.id),
        dataService.getInstitutionExams(institution.id),
        dataService.getInstitutionSubjects(institution.id)
      ]);
      setQuestions(questionsData);
      setExams(examsData);
      setSubjects(subjectsData || []);
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
    if (mode === 'bank') {
      if (!formData.subjectId) return setError('Select a subject first.');
    } else if (!formData.examId) return setError('Select an exam first.');
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

      if (mode === 'bank') {
        if (editingQuestion) {
          await dataService.updateQuestion(editingQuestion.id, { ...questionData, examId: '', subjectId: formData.subjectId });
        } else {
          await dataService.createSubjectQuestion(institution.id, formData.subjectId, questionData);
        }
      } else if (editingQuestion) {
        await dataService.updateQuestion(editingQuestion.id, questionData);
      } else {
        await dataService.createQuestion({ ...questionData, saveToBank });
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
      examId: question.examId || '',
      subjectId: question.subjectId || selectedSubject || '',
      question: question.question,
      type: question.examId
        ? (String(exam?.type || '').toLowerCase() === 'essay' ? 'essay' : (question.type === 'essay' ? 'multiple-choice' : question.type))
        : (question.type || 'multiple-choice'),
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
      if (mode === 'bank') {
        if (!selectedSubject) {
          alert('Please select a subject to import questions into.');
          return;
        }
        await dataService.addSubjectQuestions(institution.id, selectedSubject, questionsToImport);
      } else {
        if (!selectedExam) {
          alert('Please select an exam to import questions into.');
          return;
        }
        await dataService.addQuestions(selectedExam, questionsToImport);
      }
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

  const openAttachModal = () => {
    if (!selectedExam) return;
    setAttachSelection([]);
    setShowAttachModal(true);
  };

  const handleAttachQuestions = async () => {
    if (!selectedExam || !attachSelection.length) return;
    try {
      setLoading(true);
      setError('');
      const result = await dataService.attachExamQuestions(selectedExam, attachSelection);
      await loadData();
      onStatsUpdate();
      setShowAttachModal(false);
      alert(`Attached ${result.attached} question(s) to the exam${result.skipped ? ` — ${result.skipped} already attached` : ''}.`);
    } catch (err) {
      setError(err.message || 'Error attaching questions.');
      console.error('Error attaching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSaveToBank(false);
    setFormData({
      examId: '',
      subjectId: mode === 'bank' ? selectedSubject : '',
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

  const filteredQuestions = mode === 'bank'
    ? questions.filter(q => !q.examId && (!selectedSubject || q.subjectId === selectedSubject))
    : questions.filter(q => (selectedExam ? q.examId === selectedExam : Boolean(q.examId)));

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
          {mode === 'exam' && (
            <button
              onClick={openAttachModal}
              disabled={!selectedExam || loading || !attachableQuestions.length}
              title={
                !selectedExam
                  ? 'Select an exam to attach bank questions'
                  : attachableQuestions.length
                    ? 'Attach questions from the question bank'
                    : 'No bank questions available for this exam\'s subject'
              }
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Attach from Bank
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            disabled={loading || (mode === 'bank' ? !selectedSubject : !selectedExam)}
            title={mode === 'bank'
              ? (selectedSubject ? 'Import questions into the subject bank' : 'Select a subject before importing')
              : (selectedExam ? 'Import questions into the selected exam' : 'Select an exam before importing')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Import Questions
          </button>
          <button
            onClick={() => { setEditingQuestion(null); resetForm(); setShowModal(true); }}
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
          {mode === 'exam' && (
            <button
              onClick={handleClearQuestions}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              disabled={!selectedExam || loading}
            >
              Clear Questions
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Mode toggle + filter */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode('exam'); setSelectedQuestions([]); }}
            className={`px-4 py-2 text-sm font-medium ${mode === 'exam' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Exam Questions
          </button>
          <button
            type="button"
            onClick={() => { setMode('bank'); setSelectedQuestions([]); }}
            className={`px-4 py-2 text-sm font-medium ${mode === 'bank' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Question Bank
          </button>
        </div>
        {mode === 'exam' ? (
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
        ) : (
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedQuestions([]);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name}{subject.code ? ` (${subject.code})` : ''}
              </option>
            ))}
          </select>
        )}
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
              {mode === 'bank' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
              )}
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
                {mode === 'bank' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {subjectsById.get(question.subjectId)?.name || '—'}
                  </td>
                )}
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
                {mode === 'bank' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Subject
                    </label>
                    <select
                      required
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}{subject.code ? ` (${subject.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
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
                )}

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
                        {mode === 'bank' && <option value="essay">Essay</option>}
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

                {mode === 'exam' && !editingQuestion && selectedExamData?.subjectId && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="save-to-bank"
                      checked={saveToBank}
                      onChange={(e) => setSaveToBank(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="save-to-bank" className="ml-2 text-sm text-gray-700">
                      Also save a copy to the subject's question bank
                    </label>
                  </div>
                )}

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

      {/* Attach from Bank Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Attach Questions from Bank</h3>
                <p className="text-sm text-gray-500">
                  {attachExam?.title}
                  {attachExam?.subject ? ` — ${attachExam.subject}` : ''}
                  . Copies are attached, so bank edits won't change this exam.
                </p>
              </div>
              <button
                onClick={() => setShowAttachModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {attachableQuestions.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">
                  No bank questions available{attachExam?.subjectId ? ' for this subject' : ''}.
                  Create them in the Question Bank view or import a file.
                </p>
              ) : (
                attachableQuestions.map(question => (
                  <label key={question.id} className="flex items-start gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachSelection.includes(question.id)}
                      onChange={() => setAttachSelection(prev =>
                        prev.includes(question.id) ? prev.filter(id => id !== question.id) : [...prev, question.id]
                      )}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{question.question}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getQuestionTypeLabel(question.type)} · {question.points} pt{Number(question.points) === 1 ? '' : 's'}
                        {!attachExam?.subjectId && question.subjectId ? ` · ${subjectsById.get(question.subjectId)?.name || 'Unknown subject'}` : ''}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={attachableQuestions.length > 0 && attachSelection.length === attachableQuestions.length}
                  onChange={(e) => setAttachSelection(e.target.checked ? attachableQuestions.map(q => q.id) : [])}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Select all
              </label>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAttachModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttachQuestions}
                  disabled={!attachSelection.length || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Attaching...' : `Attach ${attachSelection.length} Question${attachSelection.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <QuestionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportQuestions}
        examId={mode === 'bank' ? '' : selectedExam}
        subjectId={mode === 'bank' ? selectedSubject : ''}
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

