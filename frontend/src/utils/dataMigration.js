// One-time data migration utility
import { dataService } from '../services/dataService';

const LS_KEYS = {
  QUESTIONS: "cbt_questions_v1",
  RESULTS: "cbt_results_v1",
  ACTIVE_EXAM: "cbt_active_exam_v1",
};

export const migrateLocalStorageToFirebase = async (user) => {
  try {
    console.log('🔄 Starting localStorage to Firebase migration...');
    
    // Get localStorage data
    const localResults = JSON.parse(localStorage.getItem(LS_KEYS.RESULTS) || '[]');
    const localQuestions = JSON.parse(localStorage.getItem(LS_KEYS.QUESTIONS) || '[]');
    const activeExamTitle = localStorage.getItem(LS_KEYS.ACTIVE_EXAM) || 'Institution CBT – 12 Questions';
    
    console.log(`📊 Found ${localResults.length} results and ${localQuestions.length} questions in localStorage`);
    
    // Filter results for current user
    const userResults = localResults.filter(r => r.username === user.username);
    console.log(`👤 Found ${userResults.length} results for user: ${user.username}`);
    
    if (userResults.length === 0) {
      console.log('✅ No results to migrate for this user');
      return { success: true, migrated: 0 };
    }
    
    // Create exam if questions exist
    let examId = null;
    if (localQuestions.length > 0) {
      const examData = {
        title: activeExamTitle,
        description: 'Migrated from localStorage',
        duration: 30,
        isActive: true,
        questions: localQuestions.map((q, index) => ({
          id: `migrated_${index}`,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          type: q.type || 'multiple_choice'
        }))
      };
      
      const createdExam = await dataService.createExam(examData);
      if (createdExam) {
        examId = createdExam.id;
        console.log(`📝 Created exam: ${createdExam.title} (ID: ${examId})`);
        
        // Add questions to Firebase
        await dataService.addQuestions(examId, examData.questions);
        console.log(`❓ Added ${examData.questions.length} questions to Firebase`);
      }
    }
    
    // Migrate results
    let migratedCount = 0;
    for (const result of userResults) {
      try {
        const firebaseResult = {
          examId: examId || 'legacy_exam',
          examTitle: result.examTitle || activeExamTitle,
          userId: user.id,
          studentName: user.fullName || user.username,
          username: user.username,
          answers: result.answers || {},
          score: result.score || 0,
          totalQuestions: result.total || result.totalQuestions || localQuestions.length,
          correctAnswers: result.correctAnswers || 0,
          percentage: result.percent || result.percentage || 0,
          timeSpent: result.timeSpent || 0,
          status: 'completed', // Mark as completed since they're historical
          submittedAt: result.submittedAt || new Date().toISOString()
        };
        
        await dataService.saveExamResult(firebaseResult);
        migratedCount++;
        console.log(`✅ Migrated result: ${result.examTitle} - ${result.percent}%`);
      } catch (error) {
        console.error(`❌ Failed to migrate result:`, error);
      }
    }
    
    // Mark migration as complete
    localStorage.setItem('migration_completed', 'true');
    localStorage.setItem('migration_date', new Date().toISOString());
    
    console.log(`🎉 Migration complete! Migrated ${migratedCount} results`);
    return { success: true, migrated: migratedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
};

export const checkMigrationStatus = () => {
  const completed = localStorage.getItem('migration_completed');
  const date = localStorage.getItem('migration_date');
  return { completed: completed === 'true', date };
};

export const hasLocalStorageData = () => {
  const results = JSON.parse(localStorage.getItem(LS_KEYS.RESULTS) || '[]');
  const questions = JSON.parse(localStorage.getItem(LS_KEYS.QUESTIONS) || '[]');
  return results.length > 0 || questions.length > 0;
};
