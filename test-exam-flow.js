const { dataService } = require('./frontend/src/services/dataService.js');

async function testExamFlow() {
  console.log('🧪 Testing Complete Exam Flow...\n');

  try {
    // 1. Test Exam Creation
    console.log('📝 Step 1: Creating Exam...');
    const examData = {
      title: "Test Exam",
      description: "A test exam for verification",
      duration: 30,
      questionCount: 5
    };
    
    const newExam = await dataService.createExam(examData);
    console.log('✅ Exam created:', newExam.id);
    
    // 2. Test Question Upload
    console.log('\n📋 Step 2: Adding Questions...');
    const testQuestions = [
      {
        text: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctIndex: 1
      },
      {
        text: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctIndex: 2
      },
      {
        text: "Which planet is closest to the Sun?",
        options: ["Venus", "Mars", "Mercury", "Earth"],
        correctIndex: 2
      }
    ];
    
    const saveResult = await dataService.saveQuestionsForExam(newExam.id, testQuestions);
    console.log('✅ Questions saved:', saveResult);
    
    // 3. Test Loading Questions for Exam
    console.log('\n📖 Step 3: Loading Questions for Exam...');
    const loadedQuestions = await dataService.loadQuestionsForExam(newExam.id);
    console.log('✅ Questions loaded:', loadedQuestions.length);
    
    // 4. Test Results Saving
    console.log('\n📊 Step 4: Saving Test Results...');
    const testResult = {
      username: "teststudent",
      examTitle: newExam.title,
      score: 2,
      total: 3,
      percent: 67,
      submittedAt: new Date().toISOString(),
      answers: [1, 2, 2],
      questionOrder: loadedQuestions.map(q => q.id)
    };
    
    const results = await dataService.loadResults();
    results.push(testResult);
    const saveResultsResult = await dataService.saveResults(results);
    console.log('✅ Results saved:', saveResultsResult);
    
    // 5. Test Loading Results
    console.log('\n📈 Step 5: Loading Results...');
    const loadedResults = await dataService.loadResults();
    console.log('✅ Results loaded:', loadedResults.length);
    
    // 6. Test Exam Loading
    console.log('\n📋 Step 6: Loading All Exams...');
    const allExams = await dataService.loadExams();
    console.log('✅ Exams loaded:', allExams.length);
    
    console.log('\n🎉 All tests passed! Exam flow is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testExamFlow(); 