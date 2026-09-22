import React, { useEffect, useMemo, useState } from 'react';
import firebaseDataService from '../firebase/dataService';

const defaultFormState = {
  name: '',
  code: '',
  levelsText: '',
  isActive: true,
};

const DepartmentsManagement = ({ institution, onChange }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [filter, setFilter] = useState('all');

  const hasInstitution = Boolean(institution?.id);

  const loadDepartments = async () => {
    if (!hasInstitution) return;
    try {
      setLoading(true);
      setError('');
      const data = await firebaseDataService.getInstitutionDepartments(institution.id);
      setDepartments(data || []);
    } catch (err) {
      console.error('Error loading departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInstitution) {
      loadDepartments();
    }
  }, [institution?.id]);

  const resetForm = () => {
    setFormData(defaultFormState);
    setEditingDepartment(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditModal = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name || '',
      code: department.code || '',
      levelsText: (department.levels || []).join('\n'),
      isActive: department.isActive !== false,
    });
    setShowForm(true);
  };

  const parseLevels = (levelsText) => {
    return levelsText
      .split(/\r?\n|,/)
      .map(level => level.trim())
      .filter(level => level.length > 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!hasInstitution) return;

    const levels = parseLevels(formData.levelsText);
    if (levels.length === 0) {
      setError('Please provide at least one level for the department.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      levels,
      isActive: formData.isActive,
    };

    if (!payload.name) {
      setError('Department name is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (editingDepartment) {
        await firebaseDataService.updateInstitutionDepartment(institution.id, editingDepartment.id, payload);
      } else {
        await firebaseDataService.createInstitutionDepartment(institution.id, payload);
      }
      setShowForm(false);
      resetForm();
      await loadDepartments();
      if (typeof onChange === 'function') {
        onChange();
      }
    } catch (err) {
      console.error('Error saving department:', err);
      setError('Failed to save department. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (department) => {
    if (!hasInstitution) return;
    const confirmed = window.confirm(`Delete department "${department.name}"? This will remove all associated level definitions.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await firebaseDataService.deleteInstitutionDepartment(institution.id, department.id);
      await loadDepartments();
      if (typeof onChange === 'function') {
        onChange();
      }
    } catch (err) {
      console.error('Error deleting department:', err);
      setError('Failed to delete department. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (department) => {
    if (!hasInstitution) return;
    try {
      setLoading(true);
      await firebaseDataService.updateInstitutionDepartment(institution.id, department.id, {
        isActive: !department.isActive,
      });
      await loadDepartments();
    } catch (err) {
      console.error('Error toggling department status:', err);
      setError('Failed to update department status.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    if (filter === 'active') {
      return departments.filter(dept => dept.isActive !== false);
    }
    if (filter === 'inactive') {
      return departments.filter(dept => dept.isActive === false);
    }
    return departments;
  }, [departments, filter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departments & Levels</h2>
          <p className="text-sm text-gray-600">Define the academic structure used across student registration and exam analytics.</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            disabled={!hasInstitution}
          >
            + New Department
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {departments.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow p-6 border border-dashed border-gray-300 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No departments yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create departments and their available levels. Students will pick from these during registration,
            and analytics will use them to group exam performance.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            disabled={!hasInstitution}
          >
            Create the first department
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Levels</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDepartments.map((department) => (
                <tr key={department.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{department.name}</div>
                    {department.code && (
                      <div className="text-xs text-gray-500">Code: {department.code}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      {(department.levels || []).map(level => (
                        <span key={level} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">{level}</span>
                      ))}
                      {(department.levels || []).length === 0 && (
                        <span className="text-xs text-gray-400">No levels defined</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${department.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {department.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {department.updatedAt?.toDate ? department.updatedAt.toDate().toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleToggleStatus(department)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      {department.isActive !== false ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEditModal(department)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(department)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDepartments.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No departments match the selected filter.</div>
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
                {editingDepartment ? 'Edit Department' : 'Create Department'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData(prev => ({ ...prev, name: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Nursing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Code (optional)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(event) => setFormData(prev => ({ ...prev, code: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. NUR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Levels (one per line)</label>
                <textarea
                  required
                  value={formData.levelsText}
                  onChange={(event) => setFormData(prev => ({ ...prev, levelsText: event.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={"e.g.\n100 Level\n200 Level\n300 Level"}
                />
                <p className="mt-1 text-xs text-gray-500">Students registering under this department will choose from these levels.</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="department-active"
                  checked={formData.isActive}
                  onChange={(event) => setFormData(prev => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="department-active" className="ml-2 text-sm text-gray-700">Department is active</label>
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
                  {loading ? 'Saving...' : editingDepartment ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsManagement;
