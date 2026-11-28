import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors } from '../theme';
import { applyUpdate, checkForUpdate } from '../lib/appUpdate';

const MESSAGES = {
  current: 'You have the latest version.',
  ready: 'An update is downloaded. Restart to use it.',
  disabled: 'Updates are off in this build. Install a release build to get them.',
};

// Asks the server for a JavaScript update on demand. The app also checks once on launch.
export default function UpdateButton() {
  const [status, setStatus] = useState('idle'); // idle | checking | current | ready | disabled | error
  const [message, setMessage] = useState(null);

  const press = async () => {
    setMessage(null);
    if (status === 'ready') {
      try {
        await applyUpdate();
      } catch (error) {
        console.error('Update Error:', error);
        setStatus('error');
        setMessage(error?.message ?? 'The update could not be applied. Try again.');
      }
      return;
    }
    setStatus('checking');
    try {
      const result = await checkForUpdate();
      setStatus(result);
      setMessage(MESSAGES[result]);
    } catch (error) {
      console.error('Update Error:', error);
      setStatus('error');
      setMessage(error?.message ?? 'The update could not be checked. Try again later.');
    }
  };

  const busy = status === 'checking';
  const label = status === 'ready' ? 'Restart to update' : busy ? 'Checking' : 'Check for updates';

  return (
    <View style={styles.wrap}>
      <Button
        label={label}
        icon="cloud-download-outline"
        variant={status === 'ready' ? 'solid' : 'outline'}
        onPress={press}
        loading={busy}
        disabled={busy}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 28,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
