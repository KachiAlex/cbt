import React, { useState } from 'react';
import { useToast } from './Toast';
import { ButtonSpinner } from './LoadingSpinner';
import exportService from '../services/exportService';

const ExportOptions = ({ 
  results, 
  questions = [], 
  exams = [], 
  institution = null,
  onExportComplete = null 
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportOptions, setExportOptions] = useState({
    includeAnalytics: true,
    includeQuestions: false,
    includeStudentDetails: true,
    includeTimeAnalysis: true,
    dateRange: 'all',
    selectedExams: [],
    selectedStudents: []
  });
  
  const toast = useToast();

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const options = {
        institution: institution,
        includeAnalytics: exportOptions.includeAnalytics,
        includeQuestions: exportOptions.includeQuestions,
        questions: exportOptions.includeQuestions ? questions : [],
        filename: `CBT_Report_${new Date().toISOString().split('T')[0]}`
      };

      // Filter results based on options
      let filteredResults = results;
      
      if (exportOptions.dateRange !== 'all') {
        const days = parseInt(exportOptions.dateRange);
        const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
        filteredResults = filteredResults.filter(r => new Date(r.submittedAt) >= cutoffDate);
      }

      if (exportOptions.selectedExams.length > 0) {
        filteredResults = filteredResults.filter(r => exportOptions.selectedExams.includes(r.examTitle));
      }

      if (exportOptions.selectedStudents.length > 0) {
        filteredResults = filteredResults.filter(r => exportOptions.selectedStudents.includes(r.username));
      }

      switch (exportFormat) {
        case 'excel':
          await exportService.exportResultsToExcel(filteredResults, options);
          break;
        case 'word':
          await exportService.exportResultsToWord(filteredResults, options);
          break;
        case 'csv':
          await exportService.exportResultsToCSV(filteredResults, options);
          break;
        case 'comprehensive':
          await exportService.exportComprehensiveReport(filteredResults, questions, exams, options);
          break;
        default:
          throw new Error('Unsupported export format');
      }
      
      toast.success(`${exportFormat.toUpperCase()} export completed successfully!`);
      onExportComplete && onExportComplete();
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${exportFormat.toUpperCase()} file`);
    } finally {
      setExporting(false);
    }
  };

  const formatOptions = [
    { value: 'excel', label: 'Excel (.xlsx)', description: 'Comprehensive spreadsheet with multiple sheets', icon: '📊' },
    { value: 'word', label: 'Word (.docx)', description: 'Formatted document report', icon: '📄' },
    { value: 'csv', label: 'CSV (.csv)', description: 'Simple comma-separated values', icon: '📋' },
    { value: 'comprehensive', label: 'Comprehensive Report', description: 'Multi-sheet Excel with all data', icon: '📈' }
  ];

  const uniqueExams = [...new Set(results.map(r => r.examTitle))];
  const uniqueStudents = [...new Set(results.map(r => r.username))];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
      
      {/* Format Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {formatOptions.map(format => (
            <label
              key={format.value}
              className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                exportFormat === format.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="exportFormat"
                value={format.value}
                checked={exportFormat === format.value}
                onChange={(e) => setExportFormat(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-start">
                <span className="text-2xl mr-3">{format.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{format.label}</div>
                  <div className="text-sm text-gray-600">{format.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Include in Export</label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeAnalytics}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeAnalytics: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Analytics and Statistics</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeQuestions}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeQuestions: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Question Details</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeStudentDetails}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeStudentDetails: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Student Details</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeTimeAnalysis}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeTimeAnalysis: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Time Analysis</span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Filters</label>
        
        {/* Date Range */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">Date Range</label>
          <select
            value={exportOptions.dateRange}
            onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Exam Selection */}
        {uniqueExams.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">Specific Exams (optional)</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {uniqueExams.map(exam => (
                <label key={exam} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={exportOptions.selectedExams.includes(exam)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportOptions(prev => ({
                          ...prev,
                          selectedExams: [...prev.selectedExams, exam]
                        }));
                      } else {
                        setExportOptions(prev => ({
                          ...prev,
                          selectedExams: prev.selectedExams.filter(e => e !== exam)
                        }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{exam}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Student Selection */}
        {uniqueStudents.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-2">Specific Students (optional)</label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {uniqueStudents.map(student => (
                <label key={student} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={exportOptions.selectedStudents.includes(student)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportOptions(prev => ({
                          ...prev,
                          selectedStudents: [...prev.selectedStudents, student]
                        }));
                      } else {
                        setExportOptions(prev => ({
                          ...prev,
                          selectedStudents: prev.selectedStudents.filter(s => s !== student)
                        }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{student}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Export Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Format: {formatOptions.find(f => f.value === exportFormat)?.label}</div>
          <div>• Records: {results.length} results</div>
          {exportOptions.includeAnalytics && <div>• Analytics: Included</div>}
          {exportOptions.includeQuestions && <div>• Questions: {questions.length} questions</div>}
          {exportOptions.dateRange !== 'all' && <div>• Date Range: Last {exportOptions.dateRange} days</div>}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting || results.length === 0}
        className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-semibold transition-colors ${
          exporting || results.length === 0
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {exporting ? (
          <>
            <ButtonSpinner />
            <span className="ml-2">Exporting...</span>
          </>
        ) : (
          <>
            <span className="mr-2">📤</span>
            Export {formatOptions.find(f => f.value === exportFormat)?.label}
          </>
        )}
      </button>

      {results.length === 0 && (
        <p className="text-sm text-gray-500 text-center mt-2">
          No data available for export
        </p>
      )}
    </div>
  );
};

export default ExportOptions;
