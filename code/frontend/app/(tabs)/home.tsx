import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { getColors } from "../../constants/Colors";
import { useTheme } from "../../context/ThemeContext";

export default function HomeScreen() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const colors = getColors(theme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 상단 제목 */}
      <Text style={[styles.subTitle, { color: colors.subtext }]}>
        건강 안내 도우미
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>건강이</Text>

      {/* 메시지 안내 박스 */}
      <View style={[styles.messageBox, { backgroundColor: colors.box }]}>
        <Text style={[styles.emoji, { color: colors.text }]}>🤧</Text>
        <Text style={[styles.messageHighlight, { color: colors.buttonText }]}>
          어디가 불편하신가요?
        </Text>
        <Text style={[styles.message, { color: colors.buttonText }]}>
          건강이가{"\n"}해결해 드립니다!
        </Text>
        <Text style={[styles.message, { color: colors.buttonText }]}>
          ‘건강이 시작하기’를{"\n"}눌러주세요!
        </Text>
      </View>

      {/* 버튼 섹션 */}
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.button,
              shadowColor: "#000",
            },
          ]}
          onPress={() => router.push("/chat")}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            건강이 시작하기
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleTheme}
          style={{
            marginTop: 20,
            padding: 10,
            borderRadius: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.text, textAlign: "center" }}>
            {theme === "dark" ? "☀️ 라이트 모드" : "🌙 다크 모드"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  subTitle: {
    fontSize: RFValue(20),
    fontWeight: "600",
    marginBottom: 4,
  },
  title: {
    fontSize: RFValue(32),
    fontWeight: "bold",
    marginBottom: 24,
  },
  messageBox: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 60,
    alignItems: "center",
    width: "100%",
  },
  emoji: {
    fontSize: RFValue(28),
    marginBottom: 12,
  },
  messageHighlight: {
    fontSize: RFValue(22),
    fontWeight: "bold",
    marginBottom: 16,
  },
  message: {
    fontSize: RFValue(20),
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  buttonWrapper: {
    marginTop: 20,
    alignItems: "center",
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 20,
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    fontSize: RFValue(20),
    fontWeight: "bold",
  },
});
