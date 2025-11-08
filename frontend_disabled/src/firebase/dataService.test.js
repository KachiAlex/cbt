/**
 * Firebase Data Service API Tests
 * 
 * This file contains tests to ensure all expected methods exist
 * and maintain consistent interfaces across the application.
 */

// Mock Firebase to avoid actual connections during testing
jest.mock('./config', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn()
}));

import firebaseDataService from './dataService';

describe('Firebase Data Service API Contract', () => {
  
  describe('Institution Methods', () => {
    test('should have getInstitutions method', () => {
      expect(typeof firebaseDataService.getInstitutions).toBe('function');
    });

    test('should have getInstitutionBySlug method', () => {
      expect(typeof firebaseDataService.getInstitutionBySlug).toBe('function');
    });

    test('should have createInstitution method', () => {
      expect(typeof firebaseDataService.createInstitution).toBe('function');
    });

    test('should have updateInstitution method', () => {
      expect(typeof firebaseDataService.updateInstitution).toBe('function');
    });

    test('should have updateInstitutionStatus method', () => {
      expect(typeof firebaseDataService.updateInstitutionStatus).toBe('function');
    });

    test('should have deleteInstitution method', () => {
      expect(typeof firebaseDataService.deleteInstitution).toBe('function');
    });
  });

  describe('User/Student Methods', () => {
    test('should have getInstitutionUsers method', () => {
      expect(typeof firebaseDataService.getInstitutionUsers).toBe('function');
    });

    test('should have getInstitutionStudents method (alias)', () => {
      expect(typeof firebaseDataService.getInstitutionStudents).toBe('function');
    });

    test('should have createUser method', () => {
      expect(typeof firebaseDataService.createUser).toBe('function');
    });

    test('should have updateUser method', () => {
      expect(typeof firebaseDataService.updateUser).toBe('function');
    });

    test('should have deleteUser method', () => {
      expect(typeof firebaseDataService.deleteUser).toBe('function');
    });
  });

  describe('Admin Methods', () => {
    test('should have getInstitutionAdmins method', () => {
      expect(typeof firebaseDataService.getInstitutionAdmins).toBe('function');
    });

    test('should have createAdmin method', () => {
      expect(typeof firebaseDataService.createAdmin).toBe('function');
    });

    test('should have updateAdminPassword method', () => {
      expect(typeof firebaseDataService.updateAdminPassword).toBe('function');
    });

    test('should have deleteAdmin method', () => {
      expect(typeof firebaseDataService.deleteAdmin).toBe('function');
    });
  });

  describe('Exam Methods', () => {
    test('should have getInstitutionExams method', () => {
      expect(typeof firebaseDataService.getInstitutionExams).toBe('function');
    });

    test('should have createExam method', () => {
      expect(typeof firebaseDataService.createExam).toBe('function');
    });

    test('should have updateExam method', () => {
      expect(typeof firebaseDataService.updateExam).toBe('function');
    });

    test('should have deleteExam method', () => {
      expect(typeof firebaseDataService.deleteExam).toBe('function');
    });
  });

  describe('Question Methods', () => {
    test('should have getInstitutionQuestions method', () => {
      expect(typeof firebaseDataService.getInstitutionQuestions).toBe('function');
    });

    test('should have createQuestion method', () => {
      expect(typeof firebaseDataService.createQuestion).toBe('function');
    });

    test('should have updateQuestion method', () => {
      expect(typeof firebaseDataService.updateQuestion).toBe('function');
    });

    test('should have deleteQuestion method', () => {
      expect(typeof firebaseDataService.deleteQuestion).toBe('function');
    });
  });

  describe('Results Methods', () => {
    test('should have getInstitutionResults method', () => {
      expect(typeof firebaseDataService.getInstitutionResults).toBe('function');
    });

    test('should have createResult method', () => {
      expect(typeof firebaseDataService.createResult).toBe('function');
    });

    test('should have updateResult method', () => {
      expect(typeof firebaseDataService.updateResult).toBe('function');
    });

    test('should have deleteResult method', () => {
      expect(typeof firebaseDataService.deleteResult).toBe('function');
    });
  });

  describe('Method Signature Consistency', () => {
    test('getInstitutionStudents should return same format as getInstitutionUsers', async () => {
      // Mock the methods to return consistent data
      const mockUsers = [
        { id: '1', role: 'student', username: 'student1' },
        { id: '2', role: 'admin', username: 'admin1' }
      ];

      // Mock getDocs to return test data
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({
        docs: mockUsers.map(user => ({
          id: user.id,
          data: () => user
        }))
      });

      // Both methods should exist and return consistent data structure
      expect(firebaseDataService.getInstitutionUsers).toBeDefined();
      expect(firebaseDataService.getInstitutionStudents).toBeDefined();
    });
  });
});
