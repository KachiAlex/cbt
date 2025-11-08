import React, { useState, useEffect } from 'react';
import firebaseDataService from '../firebase/dataService';

const StudentsManagement = ({ institution, onStatsUpdate }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    studentId: '',
    departmentId: '',
    level: '',
    phoneNumber: '',
    isActive: true
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    level: '',
    studentId: ''
  });

  useEffect(() => {
    const initialize = async () => {
      await loadDepartments();
      await loadStudents();
    };
    initialize();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      console.log('🔍 StudentsManagement: Loading students for institution:', institution.id);
      
      // Debug: Get all users to see what's in the database
      await firebaseDataService.getAllUsers();
      
      const studentsData = await firebaseDataService.getInstitutionUsers(institution.id);
      console.log('🔍 StudentsManagement: Loaded students:', studentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    if (!institution?.id) return;
    try {
      setDepartmentsLoading(true);
      const departmentData = await firebaseDataService.getInstitutionDepartments(institution.id);
      setDepartments(departmentData || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  useEffect(() => {
    if (!showModal || !editingStudent || !departments.length) return;
    setFormData(prev => {
      if (prev.departmentId) return prev;
      const matchedDepartment =
        departments.find(dept => dept.id === editingStudent.departmentId) ||
        departments.find(dept => dept.name === editingStudent.department);
      if (!matchedDepartment) return prev;
      const levels = matchedDepartment.levels || [];
      const currentLevel = levels.includes(editingStudent.level) ? editingStudent.level : '';
      return {
        ...prev,
        departmentId: matchedDepartment.id,
        level: currentLevel || prev.level
      };
    });
  }, [departments, editingStudent, showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!departments.length) {
        alert('Please create at least one department before adding students.');
        setLoading(false);
        return;
      }

      const selectedDepartment = departments.find(dept => dept.id === formData.departmentId);
      if (!selectedDepartment) {
        alert('Select a department for the student.');
        setLoading(false);
        return;
      }

      const departmentLevels = selectedDepartment.levels || [];
      if (departmentLevels.length > 0 && !departmentLevels.includes(formData.level)) {
        alert('Select a valid level for the chosen department.');
        setLoading(false);
        return;
      }

      if (!formData.level) {
        alert('Select the student\'s level.');
        setLoading(false);
        return;
      }

      const studentData = {
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        studentId: formData.studentId,
        departmentId: selectedDepartment.id,
        department: selectedDepartment.name,
        departmentCode: selectedDepartment.code || null,
        level: formData.level,
        phoneNumber: formData.phoneNumber,
        isActive: formData.isActive,
        institutionId: institution.id,
        institutionName: institution.name,
        role: 'student',
        createdAt: new Date().toISOString()
      };

      if (editingStudent && !formData.password) {
        delete studentData.password;
      }

      if (editingStudent) {
        await firebaseDataService.updateUser(editingStudent.id, studentData);
      } else {
        await firebaseDataService.createUser(studentData);
      }

      await loadStudents();
      onStatsUpdate();
      setShowModal(false);
      setEditingStudent(null);
      resetForm();
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    const matchedDepartment =
      departments.find(dept => dept.id === student.departmentId) ||
      departments.find(dept => dept.name === student.department);
    setFormData({
      fullName: student.fullName,
      email: student.email,
      username: student.username,
      password: '', // Don't pre-fill password
      studentId: student.studentId,
      departmentId: matchedDepartment?.id || '',
      level: student.level,
      phoneNumber: student.phoneNumber,
      isActive: student.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await firebaseDataService.deleteUser(studentId);
        await loadStudents();
        onStatsUpdate();
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleSelectStudent = (studentId, isSelected) => {
    if (isSelected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    
    try {
      setLoading(true);
      const deletePromises = selectedStudents.map(studentId => 
        firebaseDataService.deleteUser(studentId)
      );
      await Promise.all(deletePromises);
      
      setSelectedStudents([]);
      setShowDeleteConfirm(false);
      await loadStudents();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Failed to delete some students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (student) => {
    try {
      await firebaseDataService.updateUser(student.id, {
        ...student,
        isActive: !student.isActive
      });
      await loadStudents();
    } catch (error) {
      console.error('Error updating student status:', error);
    }
  };

  const resetForm = () => {
    const firstActiveDepartment = departments.find(dept => dept.isActive !== false) || departments[0] || null;
    const firstLevel = firstActiveDepartment?.levels?.[0] || '';
    setFormData({
      fullName: '',
      email: '',
      username: '',
      password: '',
      studentId: '',
      departmentId: firstActiveDepartment?.id || '',
      level: firstLevel,
      phoneNumber: '',
      isActive: true
    });
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Active
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
        Suspended
      </span>
    );
  };

  // Get unique departments combining configured records and legacy student entries
  const configuredDepartmentNames = departments.map(dept => dept.name).filter(Boolean);
  const legacyDepartmentNames = students.map(student => student.department).filter(Boolean);
  const uniqueDepartments = Array.from(new Set([...configuredDepartmentNames, ...legacyDepartmentNames])).sort();

  const getLevelsForDepartment = (departmentName) => {
    if (!departmentName) return [];
    const configured = departments.find(dept => dept.name === departmentName);
    if (configured && Array.isArray(configured.levels) && configured.levels.length) {
      return configured.levels;
    }
    const legacyLevels = students
      .filter(student => student.department === departmentName)
      .map(student => student.level)
      .filter(Boolean);
    return Array.from(new Set(legacyLevels));
  };

  const allConfiguredLevels = Array.from(new Set(departments.flatMap(dept => dept.levels || [])));
  const legacyLevels = students.map(student => student.level).filter(Boolean);
  const levelFilterPool = filters.department
    ? getLevelsForDepartment(filters.department)
    : Array.from(new Set([...allConfiguredLevels, ...legacyLevels]));
  const defaultLevelChoices = ['100', '200', '300', '400', '500', 'Postgraduate'];
  const levelFilterOptions = (levelFilterPool.length ? levelFilterPool : defaultLevelChoices).sort();

  // Filter students based on selected filters
  const filteredStudents = students.filter(student => {
    if (filters.department && student.department !== filters.department) return false;
    if (filters.level && student.level !== filters.level) return false;
    if (filters.studentId && !student.studentId?.toLowerCase().includes(filters.studentId.toLowerCase())) return false;
    return true;
  });

  // Clear selections when filters change
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      ...(filterName === 'department' ? { level: '' } : {})
    }));
    setSelectedStudents([]);
  };

  const clearFilters = () => {
    setFilters({ department: '', level: '', studentId: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Students Management</h2>
        <div className="flex space-x-3">
          {selectedStudents.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Selected ({selectedStudents.length})
            </button>
          )}
          <button
            onClick={loadDepartments}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            disabled={departmentsLoading}
          >
            {departmentsLoading ? 'Refreshing…' : 'Refresh Departments'}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className={`bg-blue-600 text-white px-4 py-2 rounded-md transition-colors ${departments.length === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            disabled={departments.length === 0}
          >
            Add New Student
          </button>
        </div>
      </div>

      {/* Alerts */}
      {departments.length === 0 && !departmentsLoading && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded">
          No departments have been configured yet. Create departments and their levels in the "Departments & Levels" tab to power drop-downs here and in student self-registration.
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Levels</option>
              {levelFilterOptions.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID
            </label>
            <input
              type="text"
              value={filters.studentId}
              onChange={(e) => handleFilterChange('studentId', e.target.value)}
              placeholder="Search by Student ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents(filteredStudents.map(s => s.id));
                    } else {
                      setSelectedStudents([]);
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <tr key={student.id} className={selectedStudents.includes(student.id) ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {student.fullName?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      <div className="text-xs text-gray-400">Username: {student.username}</div>
                      <div className="text-xs text-gray-400">Firebase ID: {student.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.studentId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {student.level}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(student.isActive)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(student)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleSuspend(student)}
                    className={`${student.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                  >
                    {student.isActive ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
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
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingStudent && <span className="text-gray-500">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingStudent}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, level: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={departments.length === 0}
                    >
                      <option value="">{departments.length ? 'Select Department' : 'No departments available'}</option>
                      {departments
                        .filter(dept => dept.isActive !== false)
                        .map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      {departments.filter(dept => dept.isActive === false).map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} (inactive)
                        </option>
                      ))}
                    </select>
                    {departments.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">Create departments in the "Departments & Levels" tab first.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Level
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={departments.length === 0}
                    >
                      <option value="">Select Level</option>
                      {(() => {
                        const selectedDepartment = departments.find(dept => dept.id === formData.departmentId);
                        const configuredLevels = selectedDepartment?.levels || [];
                        const levelOptions = formData.level && !configuredLevels.includes(formData.level)
                          ? [...configuredLevels, formData.level]
                          : configuredLevels;
                        return levelOptions.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ));
                      })()}
                    </select>
                    {departments.length > 0 && !departments.find(dept => dept.id === formData.departmentId)?.levels?.length && (
                      <p className="mt-1 text-xs text-amber-600">Add levels to this department to make selection easier.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingStudent(null);
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
                    {loading ? 'Saving...' : editingStudent ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Students</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedStudents.length} selected student{selectedStudents.length > 1 ? 's' : ''}? 
                  This action cannot be undone and will also delete all their exam results.
                </p>
              </div>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;

