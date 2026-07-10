import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold
} from "@expo-google-fonts/bricolage-grotesque";
import { Text, TextInput, TextInputProps, TextProps } from "react-native";

export const fontAssets = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold
};

export const fontFamily = {
  regular: "BricolageGrotesque_400Regular",
  medium: "BricolageGrotesque_500Medium",
  semiBold: "BricolageGrotesque_600SemiBold",
  bold: "BricolageGrotesque_700Bold",
  extraBold: "BricolageGrotesque_800ExtraBold"
};

type TextComponentWithDefaults = typeof Text & { defaultProps?: TextProps };
type TextInputComponentWithDefaults = typeof TextInput & { defaultProps?: TextInputProps };

export function applyGlobalFont() {
  const text = Text as TextComponentWithDefaults;
  const textInput = TextInput as TextInputComponentWithDefaults;

  text.defaultProps = {
    ...text.defaultProps,
    style: [{ fontFamily: fontFamily.regular }, text.defaultProps?.style]
  };

  textInput.defaultProps = {
    ...textInput.defaultProps,
    style: [{ fontFamily: fontFamily.regular }, textInput.defaultProps?.style]
  };
}
