import CodeScanner from '../components/CodeScanner';
import PermissionGate from '../components/PermissionGate';

const QR_TYPES = ['qr'];

export default function ScanQrScreen() {
  return (
    <PermissionGate title="QR code">
      <CodeScanner
        title="QR code"
        barcodeTypes={QR_TYPES}
        frameWidth={260}
        frameHeight={260}
        hint="Hold the QR code inside the box."
      />
    </PermissionGate>
  );
}
