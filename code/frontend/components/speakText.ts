import * as Speech from "expo-speech";

// 텍스트 정리 함수 (기호 제거, 줄바꿈 처리, 공백 정리)
function cleanTextForTTS(text: string): string {
  return text
    .replace(/\n/g, ". ") // 줄바꿈 → 마침표 + 공백
    .replace(/[*_~`#>\-=:+|{}[\]<>]/g, " ") // 마크다운/기호 제거
    .replace(/[^가-힣a-zA-Z0-9\\s.?!]/g, " ") // 이모지/특수문자 제거
    .replace(/\s{2,}/g, " ") // 공백 정리
    .trim();
}

// 음성 출력 함수
export function speakText(text: string, enabled: boolean = true) {
  if (!enabled) {
    Speech.stop(); // 끄기 상태면 말하고 있던 것도 멈춤
    return;
  }

  const cleaned = cleanTextForTTS(text);
  Speech.stop(); // 이미 말하는 게 있다면 멈추고 다시 시작
  Speech.speak(cleaned, {
    language: "ko-KR",
    rate: 0.95,
    pitch: 1.0,
  });
}

// 강제 중단용 함수도 export (뒤로가기용)
export function stopTTS() {
  Speech.stop();
}
