import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';

// Copies text to the clipboard and returns the toast to show for it.
// A failed copy shows an error toast instead of failing silently.
export default function useCopyToast() {
  const [toast, setToast] = useState(null);

  const copy = async (text, message) => {
    try {
      await Clipboard.setStringAsync(text);
      setToast({ id: Date.now(), message });
    } catch (error) {
      console.error('Clipboard Error:', error);
      setToast({
        id: Date.now(),
        message: 'Could not copy. Try again.',
        icon: 'alert-circle-outline',
      });
    }
  };

  return { toast, copy };
}
