import React, { useState, useRef } from 'react';
import { saveAs } from 'file-saver';
import QuestionImportParser, { PARSING_RULES } from '../utils/questionImportParser';

const QuestionImportModal = ({ isOpen, onClose, onImport, examId, institutionId }) => {
  const [importStep, setImportStep] = useState('select'); // select, preview, import
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const fileInputRef = useRef(null);
  const parser = new QuestionImportParser();

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');
    setImporting(true);

    try {
      const questions = await parser.parseFile(file);
      setParsedQuestions(questions);
      
      const stats = {
        total: questions.length,
        valid: questions.filter(q => q.question && q.question.trim().length > 0).length,
        invalid: questions.filter(q => !q.question || q.question.trim().length === 0).length
      };
      setImportStats(stats);
      
      setImportStep('preview');
    } catch (err) {
      setError(`Error parsing file: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!examId) {
      setError('Please select an exam before importing questions.');
      return;
    }
    setImporting(true);
    try {
      const validQuestions = parsedQuestions.filter(q => q.question && q.question.trim().length > 0);
      
      // Add exam and institution info to each question
      const questionsToImport = validQuestions.map(question => ({
        ...question,
        examId,
        institutionId,
        institutionName: 'Current Institution' // This should be passed as prop
      }));

      await onImport(questionsToImport);
      onClose();
    } catch (err) {
      setError(`Error importing questions: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (format) => {
    if (format === 'excel') {
      const templateData = parser.generateExcelTemplate();
      const blob = new Blob([templateData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'question_template.xlsx');
    } else if (format === 'word') {
      const templateText = parser.generateWordTemplate();
      const blob = new Blob([templateText], { type: 'text/plain' });
      saveAs(blob, 'question_template.txt');
    }
  };

  const resetModal = () => {
    setImportStep('select');
    setSelectedFile(null);
    setParsedQuestions([]);
    setError('');
    setImportStats({ total: 0, valid: 0, invalid: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Import Questions</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${importStep === 'select' ? 'text-blue-600' : importStep === 'preview' || importStep === 'import' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importStep === 'select' ? 'bg-blue-600 text-white' : importStep === 'preview' || importStep === 'import' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Select File</span>
              </div>
              <div className={`w-16 h-0.5 ${importStep === 'preview' || importStep === 'import' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${importStep === 'preview' ? 'text-blue-600' : importStep === 'import' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importStep === 'preview' ? 'bg-blue-600 text-white' : importStep === 'import' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Preview</span>
              </div>
              <div className={`w-16 h-0.5 ${importStep === 'import' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${importStep === 'import' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${importStep === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Import</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Step 1: File Selection */}
          {importStep === 'select' && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-2">Choose Import Method</h4>
                <p className="text-gray-600">Select a file to import questions from</p>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload Excel or Word file
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        Supports .xlsx, .xls, .docx, .doc files
                      </span>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.docx,.doc"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              </div>

              {/* Template Downloads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Excel Template</h5>
                  <p className="text-sm text-gray-600 mb-3">Download Excel template with flexible column mapping</p>
                  <button
                    onClick={() => downloadTemplate('excel')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Download Excel Template
                  </button>
                </div>
                <div className="border rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Word Template</h5>
                  <p className="text-sm text-gray-600 mb-3">Download Word template with flexible formatting</p>
                  <button
                    onClick={() => downloadTemplate('word')}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Download Word Template
                  </button>
                </div>
              </div>

              {/* Format Guidelines */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Format Guidelines</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h6 className="font-medium text-gray-800 mb-2">Excel Format:</h6>
                    <ul className="space-y-1">
                      <li>• Flexible column names (Question, Q, Question Text)</li>
                      <li>• Options in separate columns or combined</li>
                      <li>• Support for A, B, C, D or 1, 2, 3, 4 answers</li>
                      <li>• Auto-detection of question types</li>
                    </ul>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-800 mb-2">Word Format:</h6>
                    <ul className="space-y-1">
                      <li>• Q1., Question 1, or numbered format</li>
                      <li>• A), B), C), D) or A. B. C. D. options</li>
                      <li>• Answer: C or Correct: B format</li>
                      <li>• Flexible spacing and formatting</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {importStep === 'preview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900">Preview Questions</h4>
                <button
                  onClick={() => setImportStep('select')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back to File Selection
                </button>
              </div>

              {/* Import Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importStats.total}</div>
                  <div className="text-sm text-blue-800">Total Questions</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.valid}</div>
                  <div className="text-sm text-green-800">Valid Questions</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{importStats.invalid}</div>
                  <div className="text-sm text-red-800">Invalid Questions</div>
                </div>
              </div>

              {/* Questions Preview */}
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {parsedQuestions.map((question, index) => (
                  <div key={index} className={`p-4 border-b ${!question.question || question.question.trim().length === 0 ? 'bg-red-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-600">Question {index + 1}</span>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${question.type === 'multiple-choice' ? 'bg-blue-100 text-blue-800' : question.type === 'true-false' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {question.type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${question.difficulty === 'easy' ? 'bg-green-100 text-green-800' : question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-900 mb-2">
                      {question.question || <span className="text-red-600 italic">No question text found</span>}
                    </div>
                    {question.options && question.options.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Options:</span> {question.options.join(', ')}
                      </div>
                    )}
                    {question.correctAnswer && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Correct Answer:</span> {question.correctAnswer}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setImportStep('select')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || importStats.valid === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing...' : `Import ${importStats.valid} Questions`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Import Complete */}
          {importStep === 'import' && (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-6xl">✓</div>
              <h4 className="text-lg font-medium text-gray-900">Import Complete!</h4>
              <p className="text-gray-600">Successfully imported {importStats.valid} questions.</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionImportModal;
