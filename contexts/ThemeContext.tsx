import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";

// 1. Định nghĩa bộ màu chuẩn (Sửa màu ở đây là cả app đổi theo)
const Colors = {
  light: {
    background: "#F8F9FA",
    card: "#FFFFFF",
    text: "#1A1A1A",
    subText: "#666666",
    border: "#E5E5EA",
    primary: "#2196F3",
    iconBg: "#F5F5F5",
    success: "#4CAF50",
    warning: "#FF9800",
    danger: "#FF3B30",
    divider: "#DDD",
  },
  dark: {
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    subText: "#AAAAAA",
    border: "#333333",
    primary: "#2196F3", // Giữ nguyên hoặc chỉnh sáng hơn xíu cho dark mode
    iconBg: "#2C2C2E",
    success: "#4CAF50",
    warning: "#FF9800",
    danger: "#FF453A",
    divider: "#444",
  },
};

// 2. Tạo Context
type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof Colors.light; // Trả về bộ màu hiện tại
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 3. Tạo Provider (Cái vỏ bọc)
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme(); // Lấy giao diện mặc định của máy
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === "dark");

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Tạo Hook để component con gọi cho dễ
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
