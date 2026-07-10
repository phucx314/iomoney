import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { IOMoneyApp } from "./src/application/IOMoneyApp";
import { applyGlobalFont, fontAssets } from "./src/shared/typography";

applyGlobalFont();

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <IOMoneyApp />
    </SafeAreaProvider>
  );
}
