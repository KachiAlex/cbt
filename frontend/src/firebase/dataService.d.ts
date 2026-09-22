/**
 * TypeScript definitions for Firebase Data Service
 * 
 * This file ensures type safety and documents the expected API contract
 * for the Firebase Data Service to prevent method mismatch errors.
 */

export interface Institution {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  logo_url?: string;
  totalUsers?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface User {
  id: string;
  institutionId: string;
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: 'student' | 'admin' | 'super_admin';
  createdAt?: any;
  updatedAt?: any;
}

export interface Admin {
  id: string;
  institutionId: string;
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: 'super_admin';
  createdAt?: any;
  updatedAt?: any;
}

export interface Exam {
  id: string;
  institutionId: string;
  title: string;
  description?: string;
  duration: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Question {
  id: string;
  institutionId: string;
  examId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Result {
  id: string;
  institutionId: string;
  examId: string;
  userId: string;
  score: number;
  totalQuestions: number;
  completedAt?: any;
  updatedAt?: any;
}

export interface CreateInstitutionData {
  name: string;
  slug: string;
  logo_url?: string;
  status?: 'active' | 'suspended';
}

export interface CreateUserData {
  institutionId: string;
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: 'student' | 'admin';
}

export interface CreateAdminData {
  institutionId: string;
  username: string;
  email: string;
  fullName: string;
  password: string;
}

/**
 * Firebase Data Service Interface
 * 
 * This interface defines all methods that must be implemented
 * by the Firebase Data Service to ensure API consistency.
 */
export interface FirebaseDataServiceInterface {
  // Institution Management
  getInstitutions(): Promise<Institution[]>;
  getInstitution(institutionId: string): Promise<Institution>;
  getInstitutionBySlug(slug: string): Promise<Institution>;
  createInstitution(institutionData: CreateInstitutionData): Promise<Institution>;
  updateInstitution(institutionId: string, updateData: Partial<Institution>): Promise<boolean>;
  updateInstitutionStatus(institutionId: string, status: 'active' | 'suspended'): Promise<boolean>;
  deleteInstitution(institutionId: string): Promise<boolean>;

  // User Management
  getInstitutionUsers(institutionId: string): Promise<User[]>;
  getInstitutionStudents(institutionId: string): Promise<User[]>; // CRITICAL: This method must exist
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(userId: string, updateData: Partial<User>): Promise<boolean>;
  deleteUser(userId: string): Promise<boolean>;
  updateInstitutionUserCount(institutionId: string): Promise<number>;

  // Admin Management
  getInstitutionAdmins(institutionId: string): Promise<Admin[]>;
  createAdmin(adminData: CreateAdminData): Promise<Admin>;
  updateAdminPassword(adminId: string, newPassword: string): Promise<boolean>;
  deleteAdmin(adminId: string): Promise<boolean>;
  deleteInstitutionAdmins(institutionId: string): Promise<boolean>;

  // Exam Management
  getInstitutionExams(institutionId: string): Promise<Exam[]>;
  createExam(examData: any): Promise<Exam>;
  updateExam(examId: string, updateData: Partial<Exam>): Promise<boolean>;
  deleteExam(examId: string): Promise<boolean>;

  // Question Management
  getInstitutionQuestions(institutionId: string): Promise<Question[]>;
  createQuestion(questionData: any): Promise<Question>;
  updateQuestion(questionId: string, updateData: Partial<Question>): Promise<boolean>;
  deleteQuestion(questionId: string): Promise<boolean>;
  countQuestionsByExam(examId: string): Promise<number>;
  deleteQuestionsByExam(examId: string): Promise<boolean>;

  // Results Management
  getInstitutionResults(institutionId: string): Promise<Result[]>;
  createResult(resultData: any): Promise<Result>;
  updateResult(resultId: string, updateData: Partial<Result>): Promise<boolean>;
  deleteResult(resultId: string): Promise<boolean>;

  // Utility Methods
  getAllUsers(): Promise<User[]>;
  safeToDate(timestamp: any): Date | null;
}

declare const firebaseDataService: FirebaseDataServiceInterface;
export default firebaseDataService;
