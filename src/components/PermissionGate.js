import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import ScreenHeader from './ScreenHeader';
import { colors } from '../theme';

export default function PermissionGate({ title, children }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (permission.granted) {
    return children;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={title} />
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={44} color={colors.muted} />
        <Text style={styles.heading}>Camera access needed</Text>
        <Text style={styles.body}>
          {permission.canAskAgain
            ? 'NumScan uses the camera to read codes and text. Scanning happens on your phone.'
            : 'Camera access is off. Turn it on in your phone settings for NumScan.'}
        </Text>
        {permission.canAskAgain ? (
          <Button
            label="Allow camera"
            variant="solid"
            onPress={requestPermission}
            style={styles.button}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    alignSelf: 'stretch',
  },
});
