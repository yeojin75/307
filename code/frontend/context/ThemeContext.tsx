// context/ThemeContext.tsx
import React, { createContext, useContext, useState } from "react";

type ThemeType = "light" | "dark";

// 컨텍스트 타입 정의
const ThemeContext = createContext<{
  theme: ThemeType;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

// Provider 컴포넌트 정의
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 훅으로 쉽게 사용하도록 export
export const useTheme = () => useContext(ThemeContext);
