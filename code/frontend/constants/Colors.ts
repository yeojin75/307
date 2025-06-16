/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// constants/Colors.ts

export const Colors = {
  light: {
    background: "#ffffff",
    text: "#000000",
    tint: "#007bff",
    box: "#7ddcff",
    button: "#007bff",
    buttonText: "#ffffff",
    border: "#ccc",
    subtext: "#333",
    card: "#f9f9f9",
    highlight: "#5fd5ff",
    placeholder: "#999",
  },
  dark: {
    background: "#121212",
    text: "#ffffff",
    tint: "#5dc0ff",
    box: "#1e3a5f",
    button: "#3399ff",
    buttonText: "#ffffff",
    border: "#555",
    subtext: "#aaa",
    card: "#1e1e1e",
    highlight: "#3aa7ff",
    placeholder: "#666",
  },
};

export const getColors = (theme: "light" | "dark") => Colors[theme];
