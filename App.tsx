import { SafeAreaProvider } from "react-native-safe-area-context";
import { IOMoneyApp } from "./src/application/IOMoneyApp";

export default function App() {
  return (
    <SafeAreaProvider>
      <IOMoneyApp />
    </SafeAreaProvider>
  );
}
