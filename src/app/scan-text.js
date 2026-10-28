import PermissionGate from '../components/PermissionGate';
import TextScanner from '../components/TextScanner';

export default function ScanTextScreen() {
  return (
    <PermissionGate>
      <TextScanner mode="text" />
    </PermissionGate>
  );
}
