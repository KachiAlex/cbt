import React, { useState } from 'react';
import './ExamManagement.css';

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
  isActive: boolean;
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

interface ExamManagementProps {
  exams: Exam[];
  onExamsChange: (exams: Exam[]) => void;
}

const ExamManagement: React.FC<ExamManagementProps> = ({ exams, onExamsChange }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60,
  });

  const handleCreateExam = () => {
    const newExam: Exam = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      duration: formData.duration,
      questions: [],
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    const updatedExams = [...exams, newExam];
    onExamsChange(updatedExams);
    setFormData({ title: '', description: '', duration: 60 });
    setShowCreateForm(false);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
    });
    setShowCreateForm(true);
  };

  const handleUpdateExam = () => {
    if (!editingExam) return;

    const updatedExams = exams.map(exam =>
      exam.id === editingExam.id
        ? { ...exam, ...formData }
        : exam
    );

    onExamsChange(updatedExams);
    setEditingExam(null);
    setFormData({ title: '', description: '', duration: 60 });
    setShowCreateForm(false);
  };

  const handleDeleteExam = (examId: string) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      const updatedExams = exams.filter(exam => exam.id !== examId);
      onExamsChange(updatedExams);
    }
  };

  const toggleExamStatus = (examId: string) => {
    const updatedExams = exams.map(exam =>
      exam.id === examId
        ? { ...exam, isActive: !exam.isActive }
        : exam
    );
    onExamsChange(updatedExams);
  };

  return (
    <div className="exam-management">
      <div className="exam-header">
        <h2>Exam Management</h2>
        <button 
          className="create-button"
          onClick={() => {
            setEditingExam(null);
            setFormData({ title: '', description: '', duration: 60 });
            setShowCreateForm(true);
          }}
        >
          Create New Exam
        </button>
      </div>

      {showCreateForm && (
        <div className="create-exam-form">
          <h3>{editingExam ? 'Edit Exam' : 'Create New Exam'}</h3>
          <div className="form-group">
            <label>Exam Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter exam title"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter exam description"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Duration (minutes)</label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
              min="1"
            />
          </div>
          <div className="form-actions">
            <button 
              className="save-button"
              onClick={editingExam ? handleUpdateExam : handleCreateExam}
            >
              {editingExam ? 'Update Exam' : 'Create Exam'}
            </button>
            <button 
              className="cancel-button"
              onClick={() => {
                setShowCreateForm(false);
                setEditingExam(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="exams-list">
        {exams.length === 0 ? (
          <div className="no-exams">
            <p>No exams created yet. Create your first exam to get started.</p>
          </div>
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="exam-card">
              <div className="exam-info">
                <h3>{exam.title}</h3>
                <p>{exam.description}</p>
                <div className="exam-details">
                  <span>Duration: {exam.duration} minutes</span>
                  <span>Questions: {exam.questions.length}</span>
                  <span className={`status ${exam.isActive ? 'active' : 'inactive'}`}>
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="exam-actions">
                <button 
                  className={`toggle-button ${exam.isActive ? 'deactivate' : 'activate'}`}
                  onClick={() => toggleExamStatus(exam.id)}
                >
                  {exam.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  className="edit-button"
                  onClick={() => handleEditExam(exam)}
                >
                  Edit
                </button>
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteExam(exam.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExamManagement;
