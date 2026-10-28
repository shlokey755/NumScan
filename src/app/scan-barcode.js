import CodeScanner from '../components/CodeScanner';
import PermissionGate from '../components/PermissionGate';

const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
];

export default function ScanBarcodeScreen() {
  return (
    <PermissionGate title="Barcode">
      <CodeScanner
        title="Barcode"
        barcodeTypes={BARCODE_TYPES}
        frameWidth={280}
        frameHeight={140}
        hint="Line the barcode up with the box. Keep it flat and in focus."
      />
    </PermissionGate>
  );
}
