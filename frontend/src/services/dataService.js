// Clean data service for CBTLocal app - localStorage only
class DataService {
  constructor() {
    this.storageKeys = {
      users: 'cbt_users',
      exams: 'cbt_exams',
      questions: 'cbt_questions',
      results: 'cbt_results'
    };
  }

  // User management
  async getUsers() {
    try {
      const users = localStorage.getItem(this.storageKeys.users);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      localStorage.setItem(this.storageKeys.users, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      return false;
    }
  }

  async createUser(userData) {
    try {
      const users = await this.getUsers();
      const newUser = {
        id: `user-${Date.now()}`,
        ...userData,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      await this.saveUsers(users);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Exam management
  async getExams() {
    try {
      const exams = localStorage.getItem(this.storageKeys.exams);
      return exams ? JSON.parse(exams) : [];
    } catch (error) {
      console.error('Error getting exams:', error);
      return [];
    }
  }

  async saveExams(exams) {
    try {
      localStorage.setItem(this.storageKeys.exams, JSON.stringify(exams));
      return true;
    } catch (error) {
      console.error('Error saving exams:', error);
      return false;
    }
  }

  async createExam(examData) {
    try {
      const exams = await this.getExams();
      const newExam = {
        id: `exam-${Date.now()}`,
        ...examData,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      exams.push(newExam);
      await this.saveExams(exams);
      return newExam;
    } catch (error) {
      console.error('Error creating exam:', error);
      return null;
    }
  }

  async updateExam(examId, updates) {
    try {
      const exams = await this.getExams();
      const examIndex = exams.findIndex(e => e.id === examId);
      if (examIndex !== -1) {
        exams[examIndex] = { ...exams[examIndex], ...updates };
        await this.saveExams(exams);
        return exams[examIndex];
      }
      return null;
    } catch (error) {
      console.error('Error updating exam:', error);
      return null;
    }
  }

  async deleteExam(examId) {
    try {
      const exams = await this.getExams();
      const filteredExams = exams.filter(e => e.id !== examId);
      await this.saveExams(filteredExams);
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      return false;
    }
  }

  // Question management
  async getQuestions(examId) {
    try {
      const questions = localStorage.getItem(this.storageKeys.questions);
      const allQuestions = questions ? JSON.parse(questions) : [];
      return allQuestions.filter(q => q.examId === examId);
    } catch (error) {
      console.error('Error getting questions:', error);
      return [];
    }
  }

  async saveQuestions(questions) {
    try {
      localStorage.setItem(this.storageKeys.questions, JSON.stringify(questions));
      return true;
    } catch (error) {
      console.error('Error saving questions:', error);
      return false;
    }
  }

  async addQuestions(examId, questionsData) {
    try {
      const allQuestions = localStorage.getItem(this.storageKeys.questions);
      const questions = allQuestions ? JSON.parse(allQuestions) : [];
      
      const newQuestions = questionsData.map((q, index) => ({
        id: `q-${examId}-${Date.now()}-${index}`,
        examId,
        ...q,
        createdAt: new Date().toISOString()
      }));
      
      questions.push(...newQuestions);
      await this.saveQuestions(questions);
      return newQuestions;
    } catch (error) {
      console.error('Error adding questions:', error);
      return [];
    }
  }

  // Results management
  async getResults() {
    try {
      const results = localStorage.getItem(this.storageKeys.results);
      return results ? JSON.parse(results) : [];
    } catch (error) {
      console.error('Error getting results:', error);
      return [];
    }
  }

  async saveResults(results) {
    try {
      localStorage.setItem(this.storageKeys.results, JSON.stringify(results));
      return true;
    } catch (error) {
      console.error('Error saving results:', error);
      return false;
    }
  }

  async saveExamResult(resultData) {
    try {
      const results = await this.getResults();
      const newResult = {
        id: `result-${Date.now()}`,
        ...resultData,
        submittedAt: new Date().toISOString()
      };
      results.push(newResult);
      await this.saveResults(results);
      return newResult;
    } catch (error) {
      console.error('Error saving exam result:', error);
      return null;
    }
  }

  async getResultsByExam(examId) {
    try {
      const results = await this.getResults();
      return results.filter(r => r.examId === examId);
    } catch (error) {
      console.error('Error getting results by exam:', error);
      return [];
    }
  }

  async getResultsByUser(userId) {
    try {
      const results = await this.getResults();
      return results.filter(r => r.userId === userId);
    } catch (error) {
      console.error('Error getting results by user:', error);
      return [];
    }
  }

  // Utility methods
  clearAllData() {
    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  exportData() {
    try {
      const data = {};
      Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
        data[key] = localStorage.getItem(storageKey);
      });
      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  importData(data) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        if (this.storageKeys[key]) {
          localStorage.setItem(this.storageKeys[key], value);
        }
      });
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const dataService = new DataService();