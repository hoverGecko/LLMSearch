import { useThemeColor } from "@/hooks/useThemeColor";
import { ActivityIndicator } from "react-native-paper";

const LoadingIndicator = () => {
  const tintColor = useThemeColor({}, "tint") || "lightblue"; // Use 'tint' for the accent color
  return (
    <ActivityIndicator animating={true} size="small" color={tintColor} />
  );
};

export default LoadingIndicator;
