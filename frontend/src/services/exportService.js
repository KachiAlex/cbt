import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel } from 'docx';

class ExportService {
  constructor() {
    this.defaultStyles = {
      headerFont: { name: 'Arial', size: 12, bold: true },
      bodyFont: { name: 'Arial', size: 10 },
      titleFont: { name: 'Arial', size: 16, bold: true }
    };
  }

  // Excel Export Methods
  async exportResultsToExcel(results, options = {}) {
    const {
      filename = 'CBT_Results',
      includeAnalytics = true,
      includeQuestions = false,
      questions = [],
      institution = null
    } = options;

    const workbook = new ExcelJS.Workbook();
    
    // Main Results Sheet
    const resultsSheet = workbook.addWorksheet('Results');
    this.setupResultsSheet(resultsSheet, results);

    // Analytics Sheet
    if (includeAnalytics) {
      const analyticsSheet = workbook.addWorksheet('Analytics');
      this.setupAnalyticsSheet(analyticsSheet, results);
    }

    // Questions Sheet (if requested)
    if (includeQuestions && questions.length > 0) {
      const questionsSheet = workbook.addWorksheet('Questions');
      this.setupQuestionsSheet(questionsSheet, questions);
    }

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.setupSummarySheet(summarySheet, results, institution);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `${filename}_${timestamp}.xlsx`);
  }

  setupResultsSheet(worksheet, results) {
    // Headers
    worksheet.columns = [
      { header: 'Student ID', key: 'username', width: 15 },
      { header: 'Full Name', key: 'fullName', width: 20 },
      { header: 'Exam Title', key: 'examTitle', width: 25 },
      { header: 'Score', key: 'score', width: 8 },
      { header: 'Total Questions', key: 'total', width: 12 },
      { header: 'Percentage', key: 'percent', width: 10 },
      { header: 'Grade', key: 'grade', width: 8 },
      { header: 'Time Taken (min)', key: 'timeTaken', width: 15 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 },
      { header: 'Institution', key: 'institution', width: 20 },
      { header: 'Answers', key: 'answers', width: 30 }
    ];

    // Add data
    worksheet.addRows(results.map(result => ({
      username: result.username,
      fullName: result.fullName || result.username,
      examTitle: result.examTitle,
      score: result.score,
      total: result.total,
      percent: result.percent,
      grade: this.calculateGrade(result.percent),
      timeTaken: result.timeTaken ? Math.round(result.timeTaken / 60) : 'N/A',
      submittedAt: new Date(result.submittedAt).toLocaleString(),
      institution: result.institution || result.tenant || 'Unknown',
      answers: result.answers ? result.answers.join(', ') : 'N/A'
    })));

    // Style the header row
    worksheet.getRow(1).font = this.defaultStyles.headerFont;
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // Add conditional formatting for grades
    this.addGradeConditionalFormatting(worksheet, 'G');
  }

  setupAnalyticsSheet(worksheet, results) {
    const analytics = this.calculateAnalytics(results);
    
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Details', key: 'details', width: 30 }
    ];

    const analyticsData = [
      { metric: 'Total Students', value: analytics.totalStudents, details: 'Number of unique students' },
      { metric: 'Average Score', value: `${analytics.averageScore}%`, details: `Range: ${analytics.minScore}% - ${analytics.maxScore}%` },
      { metric: 'Pass Rate', value: `${analytics.passRate}%`, details: `Students scoring ≥ 60%` },
      { metric: 'High Performers', value: `${analytics.highPerformers}%`, details: `Students scoring ≥ 80%` },
      { metric: 'Average Time', value: `${analytics.averageTime} min`, details: `Time per exam` },
      { metric: 'Completion Rate', value: `${analytics.completionRate}%`, details: `Exams completed vs started` }
    ];

    worksheet.addRows(analyticsData);

    // Style
    worksheet.getRow(1).font = this.defaultStyles.headerFont;
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
  }

  setupQuestionsSheet(worksheet, questions) {
    worksheet.columns = [
      { header: 'Question #', key: 'number', width: 10 },
      { header: 'Question Text', key: 'text', width: 40 },
      { header: 'Option A', key: 'optionA', width: 20 },
      { header: 'Option B', key: 'optionB', width: 20 },
      { header: 'Option C', key: 'optionC', width: 20 },
      { header: 'Option D', key: 'optionD', width: 20 },
      { header: 'Correct Answer', key: 'correct', width: 15 }
    ];

    worksheet.addRows(questions.map((q, index) => ({
      number: index + 1,
      text: q.text,
      optionA: q.options[0] || '',
      optionB: q.options[1] || '',
      optionC: q.options[2] || '',
      optionD: q.options[3] || '',
      correct: q.options[q.correctIndex] || 'N/A'
    })));

    // Style
    worksheet.getRow(1).font = this.defaultStyles.headerFont;
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };
  }

  setupSummarySheet(worksheet, results, institution) {
    const analytics = this.calculateAnalytics(results);
    
    // Title
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `CBT Exam Report - ${institution?.name || 'Institution'}`;
    worksheet.getCell('A1').font = this.defaultStyles.titleFont;
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Date
    worksheet.getCell('A2').value = `Generated on: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').font = this.defaultStyles.bodyFont;

    // Summary data
    const summaryData = [
      ['Total Students', analytics.totalStudents],
      ['Total Exams Taken', results.length],
      ['Average Score', `${analytics.averageScore}%`],
      ['Pass Rate', `${analytics.passRate}%`],
      ['High Performers (≥80%)', `${analytics.highPerformers}%`],
      ['Average Time Taken', `${analytics.averageTime} minutes`]
    ];

    worksheet.addRows(summaryData, 4);

    // Style summary
    for (let i = 4; i <= 9; i++) {
      worksheet.getCell(`A${i}`).font = this.defaultStyles.bodyFont;
      worksheet.getCell(`B${i}`).font = { ...this.defaultStyles.bodyFont, bold: true };
    }
  }

  // Word Document Export
  async exportResultsToWord(results, options = {}) {
    const {
      filename = 'CBT_Results',
      includeAnalytics = true,
      institution = null
    } = options;

    const analytics = this.calculateAnalytics(results);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [new TextRun({ 
              text: `CBT Exam Report - ${institution?.name || 'Institution'}`, 
              bold: true, 
              size: 28 
            })],
            heading: HeadingLevel.TITLE
          }),
          
          // Date
          new Paragraph({
            children: [new TextRun({ 
              text: `Generated on: ${new Date().toLocaleDateString()}`,
              size: 20
            })]
          }),
          
          new Paragraph({ text: '' }),
          
          // Summary
          new Paragraph({
            children: [new TextRun({ text: 'Summary', bold: true, size: 24 })]
          }),
          
          new Paragraph({ text: `Total Students: ${analytics.totalStudents}` }),
          new Paragraph({ text: `Average Score: ${analytics.averageScore}%` }),
          new Paragraph({ text: `Pass Rate: ${analytics.passRate}%` }),
          new Paragraph({ text: `High Performers: ${analytics.highPerformers}%` }),
          
          new Paragraph({ text: '' }),
          
          // Results Table
          new Paragraph({
            children: [new TextRun({ text: 'Detailed Results', bold: true, size: 24 })]
          }),
          
          this.createResultsTable(results)
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `${filename}_${timestamp}.docx`);
  }

  createResultsTable(results) {
    const headerRow = new TableRow({
      children: [
        'Student', 'Exam', 'Score', 'Percentage', 'Grade', 'Time (min)', 'Submitted'
      ].map(header => 
        new TableCell({ 
          children: [new Paragraph({ 
            children: [new TextRun({ text: header, bold: true })] 
          })] 
        })
      )
    });

    const dataRows = results.map(result => 
      new TableRow({
        children: [
          result.username,
          result.examTitle,
          `${result.score}/${result.total}`,
          `${result.percent}%`,
          this.calculateGrade(result.percent),
          result.timeTaken ? Math.round(result.timeTaken / 60).toString() : 'N/A',
          new Date(result.submittedAt).toLocaleDateString()
        ].map(cell => 
          new TableCell({ 
            children: [new Paragraph(cell.toString())] 
          })
        )
      })
    );

    return new Table({ rows: [headerRow, ...dataRows] });
  }

  // CSV Export
  async exportResultsToCSV(results, options = {}) {
    const { filename = 'CBT_Results' } = options;
    
    const headers = [
      'Student ID', 'Full Name', 'Exam Title', 'Score', 'Total', 'Percentage', 
      'Grade', 'Time Taken (min)', 'Submitted At', 'Institution', 'Answers'
    ];
    
    const csvContent = [
      headers.join(','),
      ...results.map(result => [
        result.username,
        `"${result.fullName || result.username}"`,
        `"${result.examTitle}"`,
        result.score,
        result.total,
        result.percent,
        this.calculateGrade(result.percent),
        result.timeTaken ? Math.round(result.timeTaken / 60) : 'N/A',
        `"${new Date(result.submittedAt).toLocaleString()}"`,
        `"${result.institution || result.tenant || 'Unknown'}"`,
        `"${result.answers ? result.answers.join(', ') : 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `${filename}_${timestamp}.csv`);
  }

  // Analytics and Utility Methods
  calculateAnalytics(results) {
    if (results.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        passRate: 0,
        highPerformers: 0,
        averageTime: 0,
        completionRate: 100
      };
    }

    const uniqueStudents = new Set(results.map(r => r.username)).size;
    const scores = results.map(r => r.percent);
    const times = results.map(r => r.timeTaken).filter(t => t && t > 0);
    
    return {
      totalStudents: uniqueStudents,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100),
      highPerformers: Math.round((scores.filter(s => s >= 80).length / scores.length) * 100),
      averageTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 60) : 0,
      completionRate: 100 // Assuming all results are completed
    };
  }

  calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 45) return 'D+';
    if (percentage >= 40) return 'D';
    return 'F';
  }

  addGradeConditionalFormatting(worksheet, column) {
    // Add conditional formatting for grades
    const gradeColors = {
      'A+': 'FF00FF00', // Green
      'A': 'FF00FF00',
      'A-': 'FF00FF00',
      'B+': 'FF90EE90', // Light Green
      'B': 'FF90EE90',
      'B-': 'FF90EE90',
      'C+': 'FFFFFF00', // Yellow
      'C': 'FFFFFF00',
      'C-': 'FFFFFF00',
      'D+': 'FFFFA500', // Orange
      'D': 'FFFFA500',
      'F': 'FFFF0000'   // Red
    };

    // Note: ExcelJS doesn't support conditional formatting directly
    // This would need to be implemented with additional libraries
  }

  // Export specific exam results
  async exportExamResults(examId, results, questions, options = {}) {
    const examResults = results.filter(r => r.examTitle === examId);
    return this.exportResultsToExcel(examResults, {
      ...options,
      filename: `Exam_${examId}_Results`,
      includeQuestions: true,
      questions: questions
    });
  }

  // Export student performance over time
  async exportStudentPerformance(studentId, results, options = {}) {
    const studentResults = results.filter(r => r.username === studentId);
    return this.exportResultsToExcel(studentResults, {
      ...options,
      filename: `Student_${studentId}_Performance`
    });
  }

  // Export comprehensive report
  async exportComprehensiveReport(results, questions, exams, options = {}) {
    const { institution = null } = options;
    
    const workbook = new ExcelJS.Workbook();
    
    // Multiple sheets for comprehensive reporting
    this.setupResultsSheet(workbook.addWorksheet('All Results'), results);
    this.setupAnalyticsSheet(workbook.addWorksheet('Analytics'), results);
    this.setupQuestionsSheet(workbook.addWorksheet('Questions'), questions);
    this.setupSummarySheet(workbook.addWorksheet('Summary'), results, institution);
    
    // Exam-specific sheets
    const uniqueExams = [...new Set(results.map(r => r.examTitle))];
    uniqueExams.forEach(examTitle => {
      const examResults = results.filter(r => r.examTitle === examTitle);
      const examSheet = workbook.addWorksheet(`Exam: ${examTitle.substring(0, 30)}`);
      this.setupResultsSheet(examSheet, examResults);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `Comprehensive_CBT_Report_${timestamp}.xlsx`);
  }
}

export default new ExportService();
