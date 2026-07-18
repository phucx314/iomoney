import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export const KEYBOARD_ACCESSORY_BUFFER = Platform.OS === "android" ? 8 : 16;

export function useKeyboardBuffer(extraBottom = KEYBOARD_ACCESSORY_BUFFER) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardOpen ? extraBottom : 0;
}
