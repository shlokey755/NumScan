// Feedback on a successful read: a short haptic buzz, and a beep for barcodes.
// Both native modules are loaded only when used, so a build without them still runs.
let beepPlayer = null;

export function successHaptic() {
  try {
    const Haptics = require('expo-haptics');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch (e) {
    // This build has no haptics. Nothing to do.
  }
}

export function playBeep() {
  try {
    if (!beepPlayer) {
      const { createAudioPlayer } = require('expo-audio');
      beepPlayer = createAudioPlayer(require('../../assets/sounds/beep.wav'));
    }
    beepPlayer
      .seekTo(0)
      .then(() => beepPlayer.play())
      .catch(() => {});
  } catch (e) {
    // This build has no audio. Nothing to do.
  }
}
