import PermissionGate from '../components/PermissionGate';
import TextScanner from '../components/TextScanner';

export default function ScanNumberScreen() {
  return (
    <PermissionGate title="Numbers">
      <TextScanner title="Numbers" mode="number" />
    </PermissionGate>
  );
}
