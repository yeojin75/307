import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { speakText, stopTTS } from "../../components/speakText";
import { getColors } from "../../constants/Colors";
import { useTheme } from "../../context/ThemeContext";

type Message = {
  id: string;
  text: string;
  timestamp: Date;
  sender: "user" | "bot";
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      timestamp: new Date(),
      text: `안녕하세요!\n고객님의 건강 관리를 도와드릴 건강 도우미 ‘건강이’입니다.\n\n증상과 지역을 쉼표(,)로 구분하여 입력해 주세요.\n(예: 무릎이 아파요, 궁동 또는 두통, 대전, 서구)`,
    },
  ]);

  const [input, setInput] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const { theme } = useTheme();
  const colors = getColors(theme);

  useEffect(() => {
    const l = Keyboard.addListener("keyboardDidShow", () => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
    return () => l.remove();
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last.sender === "bot" && ttsEnabled) speakText(last.text, true);
  }, [messages, ttsEnabled]);

  useEffect(() => {
    if (!ttsEnabled) stopTTS();
  }, [ttsEnabled]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopTTS();
      };
    }, [])
  );

  // 사용 중인 운영체제(Android, iOS 등)에 따라 서버 주소를 다르게 설정하는 함수
  const getServerUrl = () => {
    if (Platform.OS === "android") {
      // Android의 에뮬레이터에서는 'localhost' 대신 '10.0.2.2'로 접속해야 함
      return "http://10.0.2.2:8000";
    } else if (Platform.OS === "ios") {
      // iOS는 localhost 사용 가능
      return "http://localhost:8000";
    } else {
      // 그 외의 경우에도 기본적으로 localhost 사용
      return "http://localhost:8000";
    }
  };

  // 사용자가 메시지를 입력하고 전송했을 때 실행되는 함수
  const handleSend = async () => {
    // 입력한 메시지가 비어있으면 아무것도 하지 않음
    if (!input.trim()) return;

    // 사용자가 입력한 메시지를 화면에 표시하기 위한 데이터 형식으로 변환
    const userMessage: Message = {
      id: Date.now().toString(), // 고유한 ID (현재 시간으로 생성)
      text: input.trim(), // 입력한 텍스트에서 공백 제거
      timestamp: new Date(), // 현재 시간 저장
      sender: "user", // 메시지 보낸 사람: 사용자
    };

    // 기존 메시지 배열에 사용자 메시지를 추가
    setMessages((prev) => [...prev, userMessage]);

    // 입력창 초기화
    setInput("");

    // 쉼표(,)를 기준으로 증상과 지역을 나누기 위해 인덱스 찾기
    const idx = userMessage.text.indexOf(",");
    let symptomInput: string | null = null;
    let locationInput: string | null = null;

    // 쉼표가 포함되어 있다면 증상과 지역으로 나누기
    if (idx !== -1) {
      symptomInput = userMessage.text.slice(0, idx).trim(); // 쉼표 앞: 증상
      locationInput = userMessage.text.slice(idx + 1).trim(); // 쉼표 뒤: 지역
    }

    // 둘 중 하나라도 없다면(입력 형식이 잘못되면) 오류 메시지를 출력
    if (!symptomInput || !locationInput) {
      const err =
        "증상과 지역을 쉼표(,) 한 번만 사용해 입력해 주세요. (예: 두통, 대전, 서구)";

      // 오류 메시지를 챗봇이 말한 것처럼 출력
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: err,
          timestamp: new Date(),
          sender: "bot", // 챗봇이 말하는 것처럼 표시
        },
      ]);

      // 스크롤을 맨 아래로 자동 이동
      scrollViewRef.current?.scrollToEnd({ animated: true });
      return; // 함수 종료
    }

    // 올바른 입력이라면 챗봇 응답을 받아오는 함수 실행
    const botText = await getBotReply(symptomInput, locationInput);

    // 받아온 챗봇 응답을 화면에 추가
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        text: botText,
        timestamp: new Date(),
        sender: "bot",
      },
    ]);

    // 스크롤을 맨 아래로 자동 이동
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // 백엔드(서버)에게 증상과 지역 정보를 보내고 추천 병원 목록을 받아오는 함수
  const getBotReply = async (msg: string, loc: string): Promise<string> => {
    try {
      // 서버로 POST 요청 보내기 (보낼 데이터는 message와 location)
      const res = await fetch(`${getServerUrl()}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, location: loc }),
      });

      // 서버가 응답한 데이터를 JSON 형식으로 파싱
      const data = await res.json();
      console.log("📦 서버 응답:", data); // 개발용 콘솔 출력

      // 서버가 병원 추천 리스트를 보내줬는지 확인
      if (
        Array.isArray(data.recommendations) &&
        data.recommendations.length > 0
      ) {
        // 유효한 병원만 필터링 (병원 이름과 추천 진료과가 있는 경우만)
        const valid = data.recommendations.filter(
          (it: any) => it.name && it.matched_department?.length > 0
        );

        // 추천 가능한 병원이 있다면 번호 붙여서 정리해서 보여줌
        if (valid.length > 0) {
          return valid
            .map((item: any, idx: number) => {
              const dept = item.matched_department.join(", ");
              return `${idx + 1}. ${item.name} (${
                item.location
              })\n추천 진료과: ${dept}`;
            })
            .join("\n\n"); // 항목마다 줄바꿈
        } else {
          // 병원은 있지만 추천 진료과 정보가 없을 때
          return (
            data.recommendations[0].matched_department?.[0] ||
            "죄송합니다. 해당 증상에 맞는 병원을 찾지 못했어요."
          );
        }
      }

      // 추천 병원이 아예 없을 경우
      return "죄송합니다. 해당 증상에 맞는 병원을 찾지 못했어요.";
    } catch (e) {
      // 서버 연결에 실패했을 경우 오류 메시지 출력
      console.error(e);
      return "서버 연결 중 문제가 발생했어요.";
    }
  };

  const formatTime = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
  };
  const formatDate = (d: Date) => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${
      days[d.getDay()]
    })`;
  };
  const isSameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* 헤더 */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            stopTTS();
            router.back();
          }}
        >
          <Text style={[styles.backText, { color: colors.buttonText }]}>
            ← 뒤로
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>건강이</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 메시지 리스트 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, i) => {
          const showDate =
            i === 0 || !isSameDate(msg.timestamp, messages[i - 1].timestamp);
          const isBot = msg.sender === "bot";
          return (
            <View key={msg.id}>
              {showDate && (
                <View style={styles.dateHeader}>
                  <Text
                    style={[
                      styles.dateHeaderText,
                      {
                        backgroundColor: colors.highlight,
                        color: colors.buttonText,
                      },
                    ]}
                  >
                    {formatDate(msg.timestamp)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.messageBlock,
                  isBot ? styles.botAlign : styles.userAlign,
                ]}
              >
                {isBot && (
                  <Text style={[styles.botName, { color: colors.tint }]}>
                    건강이
                  </Text>
                )}
                <View
                  style={[
                    styles.bubble,
                    { backgroundColor: isBot ? colors.tint : colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isBot ? colors.buttonText : colors.text },
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
                <Text style={[styles.timestamp, { color: colors.subtext }]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* TTS 토글 */}
      <View style={styles.ttsToggleContainer}>
        <TouchableOpacity
          style={[styles.ttsButton, { backgroundColor: colors.card }]}
          onPress={() => setTtsEnabled((p) => !p)}
        >
          <Text style={{ color: colors.tint, fontWeight: "bold" }}>
            {ttsEnabled ? "🔇 음성 끄기" : "🔊 음성 켜기"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 입력창 */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
          placeholder="증상, 지역을 입력하세요 (예: 두통, 대전, 서구)"
          placeholderTextColor={colors.placeholder}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.button }]}
          onPress={handleSend}
        >
          <Text style={[styles.sendButtonText, { color: colors.buttonText }]}>
            보내기
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  backText: { fontSize: 14, fontWeight: "bold" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", flex: 1 },
  messagesContainer: { flex: 1, marginTop: 12 },
  dateHeader: { alignItems: "center", marginVertical: 10 },
  dateHeaderText: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "bold",
  },
  messageBlock: { marginBottom: 12 },
  botAlign: { alignSelf: "flex-start", alignItems: "flex-start" },
  userAlign: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: "80%",
  },
  messageText: { fontSize: 18 },
  botName: { fontSize: 16, fontWeight: "bold", marginBottom: 6, marginLeft: 6 },
  timestamp: { fontSize: 12, marginTop: 4, marginHorizontal: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  sendButtonText: { fontSize: 16, fontWeight: "bold" },
  ttsToggleContainer: { alignItems: "center", marginVertical: 4 },
  ttsButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
});
