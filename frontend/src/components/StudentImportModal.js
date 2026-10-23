import React, { useRef, useState } from 'react';
import dataService from '../services/dataService';
import { parseStudentFile, validateRow, downloadStudentTemplate, downloadCredentialsCsv } from '../utils/studentImportParser';

// Bulk student import: template download -> file parse -> preview -> import
// -> per-row results. Server skips bad rows instead of failing the batch.
const StudentImportModal = ({ institution, onClose, onImported }) => {
  const [rows, setRows] = useState(null);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setParseError('');
    setRows(null);
    setResult(null);
    try {
      const parsed = await parseStudentFile(file);
      if (!parsed.length) throw new Error('No student rows found — check the file against the template');
      if (parsed.length > 500) throw new Error('Too many rows — import at most 500 students at a time');
      setRows(parsed);
    } catch (error) {
      setParseError(error.message || 'Could not parse the file');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const validRows = (rows || []).map((row, i) => ({ row, index: i, error: validateRow(row) }));
  const importable = validRows.filter(r => !r.error).length;

  const runImport = async () => {
    setImporting(true);
    try {
      const response = await dataService.importStudents(
        institution.id,
        validRows.filter(r => !r.error).map(r => r.row)
      );
      setResult(response);
      onImported?.();
    } catch (error) {
      setParseError(error.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const generated = (result?.results || []).filter(r => r.ok && r.generatedPassword);
  const failures = (result?.results || []).filter(r => !r.ok);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 sm:top-10 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Bulk Import Students</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!result && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Upload an .xlsx or .csv with columns: <span className="font-medium">Full Name, Username, Email, Level</span>
                <span className="text-gray-400"> (Department, Password, Phone optional)</span>
              </p>
              <button
                onClick={downloadStudentTemplate}
                className="ml-4 shrink-0 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Download template
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => handleFile(e.target.files?.[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}

            {rows && (
              <>
                <p className="mt-4 text-sm text-gray-700">
                  {rows.length} row(s) found — <span className="text-green-700 font-medium">{importable} ready</span>
                  {importable !== rows.length && <span className="text-red-600 font-medium">, {rows.length - importable} will be skipped</span>}
                </p>
                <div className="mt-2 max-h-64 overflow-y-auto border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Username</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Level</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Dept</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {validRows.map(({ row, index, error }) => (
                        <tr key={index} className={error ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 text-gray-400">{index + 2}</td>
                          <td className="px-3 py-2">{row.fullName}</td>
                          <td className="px-3 py-2">{row.username}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.level}</td>
                          <td className="px-3 py-2">{row.department || '—'}</td>
                          <td className="px-3 py-2">
                            {error
                              ? <span className="text-red-600 text-xs">{error}</span>
                              : <span className="text-green-600 text-xs">Ready{row.password ? '' : ' (auto password)'}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={runImport}
                disabled={!rows || !importable || importing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${importable} Student${importable === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className={`p-3 rounded-md mb-4 ${result.failed ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
              <span className="font-medium">{result.created} student(s) created</span>
              {result.failed > 0 && <span>, {result.failed} row(s) skipped</span>}
            </div>

            {generated.length > 0 && (
              <div className="mb-4 p-3 border border-blue-200 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  {generated.length} auto-generated password(s) — download them now, they are only shown once.
                </p>
                <button onClick={() => downloadCredentialsCsv(generated)} className="text-sm text-blue-700 underline hover:text-blue-900">
                  Download credentials CSV
                </button>
              </div>
            )}

            {failures.length > 0 && (
              <div className="max-h-56 overflow-y-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Username</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {failures.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-400">{r.index + 2}</td>
                        <td className="px-3 py-2">{r.username || '—'}</td>
                        <td className="px-3 py-2 text-red-600 text-xs">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentImportModal;
