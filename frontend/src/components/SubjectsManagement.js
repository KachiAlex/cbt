import React, { useEffect, useMemo, useState } from 'react';
import dataService from '../services/dataService';

const defaultFormState = {
  name: '',
  code: '',
  description: '',
  isActive: true,
};

const SubjectsManagement = ({ institution, onChange }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [filter, setFilter] = useState('all');

  const hasInstitution = Boolean(institution?.id);

  const loadSubjects = async () => {
    if (!hasInstitution) return;
    try {
      setLoading(true);
      setError('');
      const data = await dataService.getInstitutionSubjects(institution.id);
      setSubjects(data || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError('Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInstitution) {
      loadSubjects();
    }
  }, [institution?.id]);

  const resetForm = () => {
    setFormData(defaultFormState);
    setEditingSubject(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name || '',
      code: subject.code || '',
      description: subject.description || '',
      isActive: subject.isActive !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasInstitution) return;

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      description: formData.description.trim(),
      isActive: formData.isActive,
    };

    if (!payload.name) {
      setError('Subject name is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (editingSubject) {
        await dataService.updateInstitutionSubject(institution.id, editingSubject.id, payload);
      } else {
        await dataService.createInstitutionSubject(institution.id, payload);
      }
      setShowForm(false);
      resetForm();
      await loadSubjects();
      if (typeof onChange === 'function') {
        onChange();
      }
    } catch (err) {
      console.error('Error saving subject:', err);
      setError(err.message || 'Failed to save subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subject) => {
    if (!hasInstitution) return;
    const confirmed = window.confirm(`Delete subject "${subject.name}"? Subjects assigned to exams cannot be deleted until they are reassigned.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await dataService.deleteInstitutionSubject(institution.id, subject.id);
      await loadSubjects();
      if (typeof onChange === 'function') {
        onChange();
      }
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError(err.message || 'Failed to delete subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (subject) => {
    if (!hasInstitution) return;
    try {
      setLoading(true);
      await dataService.updateInstitutionSubject(institution.id, subject.id, {
        isActive: subject.isActive === false,
      });
      await loadSubjects();
    } catch (err) {
      console.error('Error toggling subject status:', err);
      setError('Failed to update subject status.');
    } finally {
      setLoading(false);
    }
  };

  const formatSubjectDate = (value) => {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  const filteredSubjects = useMemo(() => {
    if (filter === 'active') {
      return subjects.filter(subject => subject.isActive !== false);
    }
    if (filter === 'inactive') {
      return subjects.filter(subject => subject.isActive === false);
    }
    return subjects;
  }, [subjects, filter]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subjects</h2>
          <p className="text-sm text-gray-600">Define the subjects admins can attach to exams when creating them.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Subjects</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            disabled={!hasInstitution}
          >
            + New Subject
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {subjects.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow p-6 border border-dashed border-gray-300 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No subjects yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create subjects such as Mathematics, Physics or English. They will appear as options
            when you create an exam.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            disabled={!hasInstitution}
          >
            Create the first subject
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exams</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                    {subject.code && (
                      <div className="text-xs text-gray-500">Code: {subject.code}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {subject.description || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subject.questionCount ?? 0} questions
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subject.examCount ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${subject.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {subject.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatSubjectDate(subject.updatedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleToggleStatus(subject)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      {subject.isActive !== false ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEditModal(subject)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(subject)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSubjects.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No subjects match the selected filter.</div>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-4 text-sm text-gray-500">Loading...</div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-16 mx-auto max-w-lg w-full bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSubject ? 'Edit Subject' : 'Create Subject'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData(prev => ({ ...prev, name: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code (optional)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(event) => setFormData(prev => ({ ...prev, code: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. MTH101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData(prev => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What does this subject cover?"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="subject-active"
                  checked={formData.isActive}
                  onChange={(event) => setFormData(prev => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="subject-active" className="ml-2 text-sm text-gray-700">Subject is active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
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
                  {loading ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsManagement;
