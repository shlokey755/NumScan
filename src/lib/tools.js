// The app's tools, with the keywords used by the home-screen search.
// Static and in memory: no database, no network.

export const TOOLS = [
  {
    href: '/scan-qr',
    icon: 'qr-code-outline',
    title: 'QR code',
    detail: 'Read a code. Links open in one tap.',
    keywords: ['qr', 'qr code', 'scan', 'read', 'url', 'link', 'code'],
  },
  {
    href: '/scan-barcode',
    icon: 'barcode-outline',
    title: 'Barcode',
    detail: 'Product and shipping barcodes.',
    keywords: ['barcode', 'ean', 'upc', 'isbn', 'product', 'code128', 'scan', 'code'],
  },
  {
    href: '/scan-text',
    icon: 'text-outline',
    title: 'Text',
    detail: 'Copy the text inside the box.',
    keywords: ['text', 'ocr', 'copy', 'read', 'paragraph', 'clipboard', 'scan'],
  },
  {
    href: '/scan-number',
    icon: 'keypad-outline',
    title: 'Numbers',
    detail: 'Pick out digits. Copy one or all.',
    keywords: ['number', 'numbers', 'digits', 'digit', 'ocr', 'serial', 'price', 'copy', 'clipboard', 'scan'],
  },
  {
    href: '/make-qr',
    icon: 'create-outline',
    title: 'Make QR code',
    detail: 'Turn any text into a QR code.',
    keywords: ['qr', 'make', 'create', 'generate', 'encode', 'text', 'link', 'save', 'share', 'image', 'code'],
  },
  {
    href: '/from-photo',
    icon: 'image-outline',
    title: 'Read a photo',
    detail: 'Read codes, text or numbers from a photo.',
    keywords: ['photo', 'photos', 'image', 'picture', 'ocr', 'codes', 'text', 'numbers', 'library'],
  },
  {
    href: '/history',
    icon: 'time-outline',
    title: 'History',
    detail: 'Copy or delete your recent scans.',
    keywords: ['history', 'recent', 'saved', 'copies', 'scan', 'clipboard', 'delete', 'clear'],
  },
  {
    href: '/pdf',
    icon: 'document-text-outline',
    title: 'PDF tools',
    detail: 'Merge, split or create PDF files.',
    keywords: ['pdf', 'document', 'merge', 'split', 'pages', 'photos', 'images', 'text', 'share'],
  },
  {
    href: '/image-tools',
    icon: 'images-outline',
    title: 'Image tools',
    detail: 'View, zoom or convert photos.',
    keywords: ['image', 'images', 'photo', 'photos', 'picture', 'zoom', 'convert', 'jpeg', 'png', 'webp', 'share'],
  },
  {
    href: '/video',
    icon: 'videocam-outline',
    title: 'Video',
    detail: 'Play a video or make a smaller MP4.',
    keywords: ['video', 'movies', 'play', 'mp4', 'compress', 'smaller', 'save', 'share'],
  },
  {
    href: '/lab-calc',
    icon: 'flask-outline',
    title: 'Lab calculator',
    detail: 'Unit conversion, dilution, error, mean and fit.',
    keywords: ['lab', 'calculator', 'unit', 'convert', 'dilution', 'percent', 'error', 'mean', 'standard deviation', 'sd', 'linear fit', 'regression', 'stats', 'formula', 'practical'],
  },
  {
    href: '/table',
    icon: 'grid-outline',
    title: 'Table to CSV or Excel',
    detail: 'Paste readings, then save as CSV or .xlsx.',
    keywords: ['table', 'csv', 'excel', 'xlsx', 'spreadsheet', 'sheet', 'readings', 'paste', 'data', 'grid', 'export'],
  },
  {
    href: '/text-viewer',
    icon: 'code-slash-outline',
    title: 'Text and code viewer',
    detail: 'View and tidy .txt, .csv, .json, .py, .c or .html.',
    keywords: ['text', 'code', 'viewer', 'json', 'csv', 'python', 'c', 'html', 'format', 'clean', 'txt', 'view', 'file'],
  },
  {
    href: '/zip-files',
    icon: 'archive-outline',
    title: 'Rename and zip',
    detail: 'Name files with a template, then share one ZIP.',
    keywords: ['zip', 'rename', 'archive', 'batch', 'bundle', 'files', 'name', 'template', 'package'],
  },
  {
    href: '/projects',
    icon: 'folder-outline',
    title: 'Projects',
    detail: 'Keep files grouped by subject or experiment.',
    keywords: ['project', 'folder', 'folders', 'subject', 'experiment', 'group', 'organise', 'organize', 'files', 'storage'],
  },
  {
    href: '/scan-clean',
    icon: 'scan-outline',
    title: 'Clean a scan',
    detail: 'Black ink on white, with shadows removed.',
    keywords: ['scan', 'clean', 'document', 'notebook', 'handwriting', 'contrast', 'black', 'white', 'shadow', 'photo'],
  },
  {
    href: '/pdf-edit',
    icon: 'reorder-four-outline',
    title: 'Edit PDF pages',
    detail: 'Reorder, turn or remove pages before upload.',
    keywords: ['pdf', 'pages', 'rotate', 'turn', 'delete', 'remove', 'reorder', 'sideways', 'blank', 'edit'],
  },
  {
    href: '/pdf-stamp',
    icon: 'create-outline',
    title: 'Stamp and sign PDF',
    detail: 'Add DRAFT, a header, or your signature.',
    keywords: ['pdf', 'stamp', 'watermark', 'draft', 'header', 'signature', 'sign', 'name', 'roll', 'declaration', 'form'],
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
