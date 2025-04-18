import CloseIcon from '@/assets/images/close.svg';
import { Href, useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { IconButton, useTheme } from "react-native-paper";
import { Style } from "react-native-paper/lib/typescript/components/List/utils";

const BackButton = (props: { style?: Style, href?: Href }) => {
  const router = useRouter();
  const theme = useTheme();
  return (
    <IconButton
      icon={CloseIcon}
      size={28}
      style={props.style ?? styles.closeButton}
      onPress={() => {props.href ? router.navigate(props.href) : router.back()}}
    />
  );
};

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1,
  },
});

export default BackButton;
