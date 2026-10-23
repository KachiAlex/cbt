import ExcelJS from 'exceljs';

// Bulk student import: parses .xlsx and .csv into normalized rows and
// generates the downloadable template that matches the bulk endpoint's
// contract. Columns are matched case-insensitively with common aliases.

export const STUDENT_COLUMNS = {
  fullName: ['fullname', 'full name', 'name', 'student name', 'student'],
  username: ['username', 'user name', 'login', 'login id', 'user id'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  level: ['level', 'class', 'grade', 'year', 'form'],
  department: ['department', 'dept', 'faculty', 'department name', 'department code'],
  password: ['password', 'pass'],
  phoneNumber: ['phone', 'phone number', 'phonenumber', 'mobile', 'tel', 'telephone'],
};

const HEADERS = ['Full Name', 'Username', 'Email', 'Level', 'Department', 'Password', 'Phone'];

function columnIndex(headerRow) {
  const map = {};
  headerRow.forEach((cell, idx) => {
    const key = String(cell || '').trim().toLowerCase().replace(/\s+/g, ' ');
    for (const [field, aliases] of Object.entries(STUDENT_COLUMNS)) {
      if (aliases.includes(key) && map[field] === undefined) map[field] = idx;
    }
  });
  return map;
}

function toRow(cells, map) {
  const value = field => (map[field] !== undefined ? String(cells[map[field]] ?? '').trim() : '');
  const row = {
    fullName: value('fullName'),
    username: value('username'),
    email: value('email'),
    level: value('level'),
    department: value('department'),
    password: value('password'),
    phoneNumber: value('phoneNumber'),
  };
  return row;
}

const isBlank = row => !row.fullName && !row.username && !row.email && !row.level;

// Client-side pre-validation so obvious problems are flagged before upload.
export function validateRow(row) {
  if (!row.fullName || !row.username || !row.email || !row.level) return 'fullName, username, email and level are required';
  if (!/^[a-z0-9._-]{3,32}$/i.test(row.username)) return 'username must be 3-32 chars (a-z 0-9 . _ -)';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return 'invalid email address';
  if (row.password && (row.password.length < 8 || row.password.length > 128)) return 'password must be 8-128 characters';
  return null;
}

async function parseXlsx(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const rows = [];
  let map = null;
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook has no sheets');
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const v = row.getCell(c).value;
      cells.push(v && typeof v === 'object' ? (v.text ?? v.result ?? '') : v ?? '');
    }
    if (rowNumber === 1) {
      map = columnIndex(cells);
      if (map.fullName === undefined || map.email === undefined) {
        throw new Error('Header row not recognized — use the provided template');
      }
      return;
    }
    const parsed = toRow(cells, map);
    if (!isBlank(parsed)) rows.push(parsed);
  });
  if (map === null) throw new Error('The sheet is empty');
  return rows;
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) throw new Error('The file is empty');
  const map = columnIndex(parseCsvLine(lines[0]));
  if (map.fullName === undefined || map.email === undefined) {
    throw new Error('Header row not recognized — use the provided template');
  }
  return lines.slice(1).map(line => toRow(parseCsvLine(line), map)).filter(r => !isBlank(r));
}

export async function parseStudentFile(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv')) return parseCsv(await file.text());
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
  throw new Error('Unsupported file type — upload an .xlsx or .csv file');
}

// Builds the template workbook and triggers a browser download.
export async function downloadStudentTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');
  sheet.addRows([
    HEADERS,
    ['Amina Yusuf', 'amina.yusuf', 'amina.yusuf@school.com', 'SS1', 'Science', '', '08030000001'],
    ['Chinedu Okafor', 'chinedu.okafor', 'chinedu.okafor@school.com', 'SS2', 'Commercial', 'MyPass123!', '08030000002'],
    ['Fatima Bello', 'fatima.bello', 'fatima.bello@school.com', 'JSS3', '', '', ''],
  ]);
  sheet.getRow(1).font = { bold: true };
  [22, 16, 32, 10, 18, 14, 16].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

  const help = workbook.addWorksheet('Instructions');
  help.addRows([
    ['Bulk Student Import — instructions'],
    [''],
    ['Required columns: Full Name, Username, Email, Level.'],
    ['Username: 3-32 characters, lowercase letters, numbers, dots, underscores or hyphens.'],
    ['Level: your institution\'s level label (e.g. SS1, JSS2, 100 Level).'],
    ['Department: optional — use the department name or code exactly as configured. Required only if your institution requires departments.'],
    ['Password: optional — leave blank to auto-generate a password. Generated passwords are shown once after import and can be downloaded as a CSV.'],
    ['Phone: optional.'],
    [''],
    ['Tips:'],
    ['- Delete the example rows before uploading.'],
    ['- Rows with a bad email, duplicate username, or unknown department are skipped and reported — the rest still import.'],
    ['- Keep the header row unchanged; the importer accepts .xlsx or .csv.'],
  ]);
  help.getRow(1).font = { bold: true, size: 14 };
  help.getColumn(1).width = 110;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student-import-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// CSV of generated credentials for distribution (username, generated password).
export function downloadCredentialsCsv(rows) {
  const lines = ['Username,Email,Password'];
  rows.forEach(r => lines.push(`"${r.username}","${r.email}","${r.generatedPassword}"`));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student-credentials.csv';
  a.click();
  URL.revokeObjectURL(url);
}
