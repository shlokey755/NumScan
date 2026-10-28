import { useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View } from 'react-native';
import ActionButton from './ActionButton';

export default function PermissionGate({ children }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.text}>
            {permission.canAskAgain
              ? 'NumScan needs camera access to scan.'
              : 'Camera access is off. Turn it on in your phone settings for NumScan.'}
          </Text>
          {permission.canAskAgain ? (
            <ActionButton label="Allow camera" primary onPress={requestPermission} />
          ) : null}
        </View>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
