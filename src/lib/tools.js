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
