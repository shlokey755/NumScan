// The app's tools, with the keywords used by the home-screen search.
// Static and in memory: no database, no network.
//
// Each tool belongs to one head. The home screen draws the heads as a link map:
// a numbered head, with the closely related tools linked under it.

export const HEADS = [
  { number: '01', title: 'Scan', hint: 'Codes, text and numbers' },
  { number: '02', title: 'PDF', hint: 'Edit, stamp, merge and convert' },
  { number: '03', title: 'Pictures and video', hint: 'Photos, clean-up and video' },
  { number: '04', title: 'Calculators', hint: 'Lab, scientific, grades, dates and bases' },
  { number: '05', title: 'Writing and code', hint: 'Word count, patterns, tables and logic' },
  { number: '06', title: 'Files', hint: 'Projects, zips and history' },
];

export const TOOLS = [
  {
    head: '01',
    href: '/scan-qr',
    icon: 'qr-code-outline',
    title: 'QR code',
    detail: 'Read a code. Links open in one tap.',
    keywords: ['qr', 'qr code', 'scan', 'read', 'url', 'link', 'code'],
  },
  {
    head: '01',
    href: '/make-qr',
    icon: 'create-outline',
    title: 'Make QR code',
    detail: 'Turn any text into a QR code.',
    keywords: ['qr', 'make', 'create', 'generate', 'encode', 'text', 'link', 'save', 'share', 'image', 'code'],
  },
  {
    head: '01',
    href: '/scan-barcode',
    icon: 'barcode-outline',
    title: 'Barcode',
    detail: 'Product and shipping barcodes.',
    keywords: ['barcode', 'ean', 'upc', 'isbn', 'product', 'code128', 'scan', 'code'],
  },
  {
    head: '01',
    href: '/scan-text',
    icon: 'text-outline',
    title: 'Text',
    detail: 'Copy the text inside the box.',
    keywords: ['text', 'ocr', 'copy', 'read', 'paragraph', 'clipboard', 'scan'],
  },
  {
    head: '01',
    href: '/scan-number',
    icon: 'keypad-outline',
    title: 'Numbers',
    detail: 'Pick out digits. Copy one or all.',
    keywords: ['number', 'numbers', 'digits', 'digit', 'ocr', 'serial', 'price', 'copy', 'clipboard', 'scan'],
  },
  {
    head: '01',
    href: '/from-photo',
    icon: 'image-outline',
    title: 'Read a photo',
    detail: 'Read codes, text or numbers from a photo.',
    keywords: ['photo', 'photos', 'image', 'picture', 'ocr', 'codes', 'text', 'numbers', 'library'],
  },
  {
    head: '01',
    href: '/scan-clean',
    icon: 'scan-outline',
    title: 'Clean a scan',
    detail: 'Black ink on white, with shadows removed.',
    keywords: ['scan', 'clean', 'document', 'notebook', 'handwriting', 'contrast', 'black', 'white', 'shadow', 'photo'],
  },
  {
    head: '02',
    href: '/pdf',
    icon: 'document-text-outline',
    title: 'PDF tools',
    detail: 'Merge, split or create PDF files.',
    keywords: ['pdf', 'document', 'merge', 'split', 'pages', 'photos', 'images', 'text', 'share'],
  },
  {
    head: '02',
    href: '/pdf-edit',
    icon: 'reorder-four-outline',
    title: 'Edit PDF pages',
    detail: 'Reorder, turn or remove pages before upload.',
    keywords: ['pdf', 'pages', 'rotate', 'turn', 'delete', 'remove', 'reorder', 'sideways', 'blank', 'edit'],
  },
  {
    head: '02',
    href: '/pdf-stamp',
    icon: 'create-outline',
    title: 'Stamp and sign PDF',
    detail: 'Add DRAFT, a header, or your signature.',
    keywords: ['pdf', 'stamp', 'watermark', 'draft', 'header', 'signature', 'sign', 'name', 'roll', 'declaration', 'form'],
  },
  {
    head: '02',
    href: '/pdf-markdown',
    icon: 'swap-horizontal-outline',
    title: 'PDF and Markdown',
    detail: 'Turn a PDF into Markdown, or Markdown into a PDF.',
    keywords: ['pdf', 'markdown', 'md', 'convert', 'text', 'document', 'notes', 'readme', 'txt', 'export', 'import'],
  },
  {
    head: '03',
    href: '/image-tools',
    icon: 'images-outline',
    title: 'Image tools',
    detail: 'View, zoom or convert photos.',
    keywords: ['image', 'images', 'photo', 'photos', 'picture', 'zoom', 'convert', 'jpeg', 'png', 'webp', 'share'],
  },
  {
    head: '03',
    href: '/video',
    icon: 'videocam-outline',
    title: 'Video',
    detail: 'Play a video or make a smaller MP4.',
    keywords: ['video', 'movies', 'play', 'mp4', 'compress', 'smaller', 'save', 'share'],
  },
  {
    head: '04',
    href: '/lab-calc',
    icon: 'flask-outline',
    title: 'Lab calculator',
    detail: 'Unit conversion, dilution, error, mean and fit.',
    keywords: ['lab', 'calculator', 'unit', 'convert', 'dilution', 'percent', 'error', 'mean', 'standard deviation', 'sd', 'linear fit', 'regression', 'stats', 'formula', 'practical'],
  },
  {
    head: '04',
    href: '/scientific-calc',
    icon: 'calculator-outline',
    title: 'Scientific calculator',
    detail: 'Trig, logs, powers and roots. Degrees or radians.',
    keywords: ['calculator', 'scientific', 'maths', 'math', 'sin', 'cos', 'tan', 'arcsin', 'log', 'ln', 'sqrt', 'power', 'factorial', 'pi', 'copy', 'degrees', 'radians'],
  },
  {
    head: '04',
    href: '/grades',
    icon: 'school-outline',
    title: 'Grades and GPA',
    detail: 'Weighted average, the mark you need, and GPA.',
    keywords: ['grade', 'grades', 'gpa', 'average', 'weighted', 'mark', 'marks', 'score', 'needed', 'target', 'credits', 'course', 'exam', 'points'],
  },
  {
    head: '04',
    href: '/date-calc',
    icon: 'calendar-outline',
    title: 'Date calculator',
    detail: 'Days between two dates, or a date plus some days.',
    keywords: ['date', 'dates', 'days', 'deadline', 'due', 'calendar', 'working days', 'weekdays', 'between', 'add', 'countdown', 'duration', 'today'],
  },
  {
    head: '04',
    href: '/number-bases',
    icon: 'hardware-chip-outline',
    title: 'Number bases',
    detail: 'Binary, octal, decimal and hex, with bit operations.',
    keywords: ['binary', 'hex', 'hexadecimal', 'octal', 'decimal', 'base', 'bits', 'twos complement', 'bitwise', 'convert', 'computing', 'computer'],
  },
  {
    head: '05',
    href: '/word-count',
    icon: 'reader-outline',
    title: 'Word counter',
    detail: 'Words, characters, sentences and a word target.',
    keywords: ['word', 'words', 'count', 'characters', 'letters', 'essay', 'limit', 'target', 'reading time', 'sentences', 'paragraphs', 'length', 'text', 'file'],
  },
  {
    head: '05',
    href: '/regex',
    icon: 'search-outline',
    title: 'Regex tester',
    detail: 'Test a pattern and see every match.',
    keywords: ['regex', 'regexp', 'regular expression', 'pattern', 'match', 'find', 'search', 'group', 'capture', 'code', 'text'],
  },
  {
    head: '05',
    href: '/table',
    icon: 'grid-outline',
    title: 'Table to CSV or Excel',
    detail: 'Paste readings, then save as CSV or .xlsx.',
    keywords: ['table', 'csv', 'excel', 'xlsx', 'spreadsheet', 'sheet', 'readings', 'paste', 'data', 'grid', 'export'],
  },
  {
    head: '05',
    href: '/text-viewer',
    icon: 'code-slash-outline',
    title: 'Text and code viewer',
    detail: 'View and tidy .txt, .csv, .json, .py, .c or .html.',
    keywords: ['text', 'code', 'viewer', 'json', 'csv', 'python', 'c', 'html', 'format', 'clean', 'txt', 'view', 'file'],
  },
  {
    head: '05',
    href: '/truth-table',
    icon: 'git-branch-outline',
    title: 'Truth table',
    detail: 'Work out a logic expression for every input.',
    keywords: ['logic', 'truth', 'table', 'boolean', 'and', 'or', 'not', 'xor', 'gate', 'circuit', 'digital', 'bit', 'expression'],
  },
  {
    head: '06',
    href: '/projects',
    icon: 'folder-outline',
    title: 'Projects',
    detail: 'Keep files grouped by subject or experiment.',
    keywords: ['project', 'folder', 'folders', 'subject', 'experiment', 'group', 'organise', 'organize', 'files', 'storage'],
  },
  {
    head: '06',
    href: '/zip-files',
    icon: 'archive-outline',
    title: 'Rename and zip',
    detail: 'Name files with a template, then share one ZIP.',
    keywords: ['zip', 'rename', 'archive', 'batch', 'bundle', 'files', 'name', 'template', 'package'],
  },
  {
    head: '06',
    href: '/history',
    icon: 'time-outline',
    title: 'History',
    detail: 'Copy or delete your recent scans.',
    keywords: ['history', 'recent', 'saved', 'copies', 'scan', 'clipboard', 'delete', 'clear'],
  },
];

// Every word typed must match part of the tool's title or one of its keywords.
// Matching ignores case and extra spaces. An empty search returns every tool.
export function searchTools(query, tools = TOOLS) {
  const terms = (query ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return tools;

  return tools.filter((tool) => {
    const fields = [tool.title, ...tool.keywords].map((f) => f.toLowerCase());
    return terms.every((term) => fields.some((field) => field.includes(term)));
  });
}

// The heads in order, each with its tools in list order. Heads with no tools are left out.
export function groupTools(tools = TOOLS) {
  return HEADS.map((head) => ({
    ...head,
    tools: tools.filter((tool) => tool.head === head.number),
  })).filter((head) => head.tools.length > 0);
}

// A three-digit hex key for a tool, from its path (FNV-1a hash, low 12 bits).
// It is the same every time, so each tool always shows the same key.
export function slotOf(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash & 0xfff).toString(16).toUpperCase().padStart(3, '0');
}
