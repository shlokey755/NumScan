import PermissionGate from '../components/PermissionGate';
import TextScanner from '../components/TextScanner';

export default function ScanNumberScreen() {
  return (
    <PermissionGate>
      <TextScanner mode="number" />
    </PermissionGate>
  );
}
