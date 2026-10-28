import PermissionGate from '../components/PermissionGate';
import TextScanner from '../components/TextScanner';

export default function ScanTextScreen() {
  return (
    <PermissionGate title="Text">
      <TextScanner title="Text" mode="text" />
    </PermissionGate>
  );
}
