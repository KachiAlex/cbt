/**
 * 🔧 Firebase Firestore Exam Results Fix Script
 * 
 * This script fixes the critical bug in the exam scoring system for Firebase Firestore
 * and recalculates all existing results that were incorrectly marked as 0/20.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5oUy7N8G633FCjmu34FrLBZvjsm1tdVc",
  authDomain: "cbt-91a97.firebaseapp.com",
  projectId: "cbt-91a97",
  storageBucket: "cbt-91a97.firebasestorage.app",
  messagingSenderId: "273021677586",
  appId: "1:273021677586:web:f1170c3a9a9f25493028cb",
  measurementId: "G-PMMHZEBZ92"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Nigeria Water Works Corporation Exam ID
const NIGERIA_WATER_EXAM_ID = "db2a5a11-2976-4783-a7a8-12bf931899f4";

/**
 * Calculate correct score for a student's answers using the FIXED logic
 */
function calculateCorrectScore(studentAnswers, questions) {
  let correctCount = 0;
  
  questions.forEach(question => {
    const studentAnswer = studentAnswers[question.id];
    
    // FIXED: Get the correct answer text using correctIndex
    const correctOptionIndex = question.correctIndex;
    const correctAnswerText = question.options[correctOptionIndex];
    
    // FIXED: Compare student answer with correct answer text
    if (studentAnswer === correctAnswerText) {
      correctCount++;
    }
  });
  
  return correctCount;
}

/**
 * Get all questions for a specific exam
 */
async function getExamQuestions(examId) {
  try {
    const q = query(collection(db, 'questions'), where('examId', '==', examId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting questions:', error);
    return [];
  }
}

/**
 * Get all results for a specific exam
 */
async function getExamResults(examId) {
  try {
    const q = query(collection(db, 'results'), where('examId', '==', examId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting results:', error);
    return [];
  }
}

/**
 * Update a single result with the correct score
 */
async function updateResultScore(resultId, correctAnswers, totalQuestions, percentage) {
  try {
    const resultRef = doc(db, 'results', resultId);
    await updateDoc(resultRef, {
      score: correctAnswers,
      correctAnswers: correctAnswers,
      percentage: percentage,
      totalQuestions: totalQuestions,
      total: totalQuestions,
      recalculated: true,
      recalculatedAt: serverTimestamp(),
      recalculatedNote: 'Score recalculated due to scoring bug fix in ExamInterface.js'
    });
    return true;
  } catch (error) {
    console.error('Error updating result:', error);
    return false;
  }
}

/**
 * Fix results for Nigeria Water Works Corporation exam
 */
async function fixNigeriaWaterResults() {
  try {
    console.log('🚀 Starting fix for Nigeria Water Works Corporation exam results...\n');
    
    // Get questions for the exam
    console.log('📚 Loading exam questions...');
    const questions = await getExamQuestions(NIGERIA_WATER_EXAM_ID);
    
    if (questions.length === 0) {
      console.log('❌ No questions found for the Nigeria Water Works Corporation exam');
      return;
    }
    
    console.log(`✅ Found ${questions.length} questions for the exam\n`);
    
    // Get all results for the exam
    console.log('📊 Loading exam results...');
    const results = await getExamResults(NIGERIA_WATER_EXAM_ID);
    
    if (results.length === 0) {
      console.log('❌ No results found for the Nigeria Water Works Corporation exam');
      return;
    }
    
    console.log(`✅ Found ${results.length} results to process\n`);
    
    let fixedCount = 0;
    let totalProcessed = 0;
    
    // Process each result
    for (const result of results) {
      totalProcessed++;
      console.log(`\n🔍 Processing result ${totalProcessed}/${results.length}:`);
      console.log(`   Student: ${result.studentName || result.username || 'Unknown'}`);
      console.log(`   Current Score: ${result.correctAnswers || result.score || 0}/${result.totalQuestions || questions.length}`);
      console.log(`   Current Percentage: ${result.percentage || 0}%`);
      
      // Calculate the correct score using the FIXED logic
      const correctAnswers = calculateCorrectScore(result.answers, questions);
      const percentage = Math.round((correctAnswers / questions.length) * 100);
      
      console.log(`   📊 Recalculated Score: ${correctAnswers}/${questions.length} (${percentage}%)`);
      
      // Check if score needs updating
      const currentScore = result.correctAnswers || result.score || 0;
      
      if (correctAnswers !== currentScore) {
        console.log(`   🔧 Updating score from ${currentScore} to ${correctAnswers}...`);
        
        const updateSuccess = await updateResultScore(
          result.id, 
          correctAnswers, 
          questions.length, 
          percentage
        );
        
        if (updateSuccess) {
          console.log(`   ✅ Successfully updated result`);
          fixedCount++;
        } else {
          console.log(`   ❌ Failed to update result`);
        }
      } else {
        console.log(`   ✅ Score was already correct`);
      }
    }
    
    console.log('\n🎉 FIX COMPLETED!');
    console.log(`📊 Total results processed: ${totalProcessed}`);
    console.log(`🔧 Total results fixed: ${fixedCount}`);
    console.log(`✅ Fix success rate: ${totalProcessed > 0 ? Math.round((fixedCount / totalProcessed) * 100) : 0}%`);
    
    if (fixedCount > 0) {
      console.log('\n🎯 Your results have been corrected!');
      console.log('   - Check your exam results in the system');
      console.log('   - The scores should now reflect your actual performance');
      console.log('   - All future exams will be scored correctly');
    }
    
  } catch (error) {
    console.error('❌ Error fixing results:', error);
  }
}

/**
 * Fix all exam results in the system
 */
async function fixAllExamResults() {
  try {
    console.log('🚀 Starting comprehensive fix for all exam results...\n');
    
    // Get all results
    const resultsSnapshot = await getDocs(collection(db, 'results'));
    const allResults = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📊 Found ${allResults.length} total results in the system`);
    
    // Group results by exam
    const resultsByExam = {};
    allResults.forEach(result => {
      if (!resultsByExam[result.examId]) {
        resultsByExam[result.examId] = [];
      }
      resultsByExam[result.examId].push(result);
    });
    
    console.log(`📚 Found ${Object.keys(resultsByExam).length} unique exams\n`);
    
    let totalFixed = 0;
    let totalProcessed = 0;
    
    // Process each exam
    for (const [examId, results] of Object.entries(resultsByExam)) {
      console.log(`\n🎯 Processing exam: ${results[0].examTitle || examId}`);
      console.log(`   Results to process: ${results.length}`);
      
      // Get questions for this exam
      const questions = await getExamQuestions(examId);
      
      if (questions.length === 0) {
        console.log(`   ⚠️  No questions found for this exam, skipping...`);
        continue;
      }
      
      // Process each result
      for (const result of results) {
        totalProcessed++;
        
        // Calculate correct score
        const correctAnswers = calculateCorrectScore(result.answers, questions);
        const percentage = Math.round((correctAnswers / questions.length) * 100);
        
        // Check if update is needed
        const currentScore = result.correctAnswers || result.score || 0;
        
        if (correctAnswers !== currentScore) {
          const updateSuccess = await updateResultScore(
            result.id, 
            correctAnswers, 
            questions.length, 
            percentage
          );
          
          if (updateSuccess) {
            totalFixed++;
          }
        }
      }
    }
    
    console.log('\n🎉 COMPREHENSIVE FIX COMPLETED!');
    console.log(`📊 Total results processed: ${totalProcessed}`);
    console.log(`🔧 Total results fixed: ${totalFixed}`);
    console.log(`✅ Fix success rate: ${totalProcessed > 0 ? Math.round((totalFixed / totalProcessed) * 100) : 0}%`);
    
  } catch (error) {
    console.error('❌ Error in comprehensive fix:', error);
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔧 Firebase Firestore Exam Results Fix Script');
    console.log('=' * 50);
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--all')) {
      // Fix all results
      await fixAllExamResults();
    } else {
      // Fix only Nigeria Water Works Corporation exam results
      await fixNigeriaWaterResults();
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
  }
}

// Run the script
main();
