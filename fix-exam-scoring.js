/**
 * 🔧 Exam Scoring Fix Script
 * 
 * This script fixes the critical bug in the exam scoring system and recalculates
 * all existing results that were incorrectly marked as 0/20.
 * 
 * The bug was: comparing student answers (text) with question.correctAnswer (undefined)
 * instead of comparing with question.options[correctIndex] (the actual correct text)
 */

// Import required modules (adjust paths as needed)
const mongoose = require('mongoose');
const Result = require('./backend/src/models/Result');
const Question = require('./backend/src/models/Question');
const Exam = require('./backend/src/models/Exam');

// Database connection (adjust connection string as needed)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbt_system');
    console.log('✅ Connected to database');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

/**
 * Calculate correct score for a student's answers
 */
const calculateCorrectScore = (studentAnswers, questions) => {
  let correctCount = 0;
  
  questions.forEach(question => {
    const studentAnswer = studentAnswers[question.id];
    
    // Get the correct answer text using correctIndex
    const correctOptionIndex = question.correctIndex;
    const correctAnswerText = question.options[correctOptionIndex];
    
    // Compare student answer with correct answer text
    if (studentAnswer === correctAnswerText) {
      correctCount++;
    }
  });
  
  return correctCount;
};

/**
 * Fix a single result by recalculating the score
 */
const fixSingleResult = async (result) => {
  try {
    console.log(`\n🔍 Processing result for: ${result.username} - ${result.examTitle}`);
    console.log(`   Current score: ${result.correctAnswers}/${result.totalQuestions} (${result.percent}%)`);
    
    // Get questions for this exam
    const questions = await Question.find({ examId: result.examId });
    
    if (questions.length === 0) {
      console.log(`   ⚠️  No questions found for exam ${result.examId}`);
      return false;
    }
    
    // Calculate the correct score
    const correctAnswers = calculateCorrectScore(result.answers, questions);
    const percentage = Math.round((correctAnswers / questions.length) * 100);
    
    console.log(`   📊 Recalculated score: ${correctAnswers}/${questions.length} (${percentage}%)`);
    
    // Update the result if the score changed
    if (correctAnswers !== result.correctAnswers) {
      await Result.findByIdAndUpdate(result._id, {
        score: correctAnswers,
        correctAnswers: correctAnswers,
        percent: percentage,
        totalQuestions: questions.length,
        total: questions.length,
        // Add a flag to indicate this was recalculated
        recalculated: true,
        recalculatedAt: new Date()
      });
      
      console.log(`   ✅ Updated result - Score changed from ${result.correctAnswers} to ${correctAnswers}`);
      return true;
    } else {
      console.log(`   ✅ Score was already correct`);
      return false;
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing result ${result._id}:`, error);
    return false;
  }
};

/**
 * Fix all results for a specific exam
 */
const fixExamResults = async (examId, examTitle) => {
  try {
    console.log(`\n🎯 Fixing results for exam: ${examTitle} (${examId})`);
    
    // Get all results for this exam
    const results = await Result.find({ examId: examId });
    
    if (results.length === 0) {
      console.log(`   📝 No results found for this exam`);
      return { total: 0, fixed: 0 };
    }
    
    console.log(`   📊 Found ${results.length} results to process`);
    
    let fixedCount = 0;
    
    for (const result of results) {
      const wasFixed = await fixSingleResult(result);
      if (wasFixed) fixedCount++;
    }
    
    console.log(`   ✅ Completed: ${fixedCount}/${results.length} results were updated`);
    
    return { total: results.length, fixed: fixedCount };
    
  } catch (error) {
    console.error(`❌ Error fixing exam results:`, error);
    return { total: 0, fixed: 0 };
  }
};

/**
 * Fix all results in the system
 */
const fixAllResults = async () => {
  try {
    console.log('\n🚀 Starting comprehensive exam scoring fix...\n');
    
    // Get all exams
    const exams = await Exam.find({});
    console.log(`📚 Found ${exams.length} exams in the system`);
    
    let totalResults = 0;
    let totalFixed = 0;
    
    // Process each exam
    for (const exam of exams) {
      const stats = await fixExamResults(exam.id, exam.title);
      totalResults += stats.total;
      totalFixed += stats.fixed;
    }
    
    console.log('\n🎉 COMPREHENSIVE FIX COMPLETED!');
    console.log(`📊 Total results processed: ${totalResults}`);
    console.log(`🔧 Total results fixed: ${totalFixed}`);
    console.log(`✅ Fix success rate: ${totalResults > 0 ? Math.round((totalFixed / totalResults) * 100) : 0}%`);
    
    return { totalResults, totalFixed };
    
  } catch (error) {
    console.error('❌ Error in comprehensive fix:', error);
    throw error;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await connectDB();
    
    // Check if specific exam ID is provided as argument
    const examId = process.argv[2];
    
    if (examId) {
      // Fix specific exam
      const exam = await Exam.findOne({ id: examId });
      if (!exam) {
        console.log(`❌ Exam with ID ${examId} not found`);
        return;
      }
      await fixExamResults(exam.id, exam.title);
    } else {
      // Fix all results
      await fixAllResults();
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fixAllResults,
  fixExamResults,
  fixSingleResult,
  calculateCorrectScore
};

