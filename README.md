# 건강이 (Health-i) — 고령층을 위한 병원·복지 서비스 자동 추천 챗봇

> **고령층이 자연어로 증상과 지역을 입력하면, 공공데이터를 기반으로 가까운 병원과 추천 진료과를 알려주는 모바일 챗봇 애플리케이션**

- 사업: 미래내일일경험 (2025.05.20 ~ 2025.06.30)
- 참여기관: 동구노인종합복지관
- 팀: 7기 307조 — 한수창(팀장), 송현용, 이현서, 윤여진

<p align="center">
<img width="380" alt="건강이 메인" src="https://github.com/user-attachments/assets/cda16c77-de85-4cf8-b481-a4c68c155116" />
</p>

---

## 1. 프로젝트 개요

급속한 고령화와 독거노인 증가로 디지털 소외 문제가 커지고 있습니다. "건강이"는 복잡한 병원 검색 과정을 한 번의 자연어 입력으로 해결하기 위해 만든 챗봇 서비스로, **대화형 UI + 음성 안내(TTS)** 를 결합하여 시니어가 손쉽게 사용할 수 있도록 설계했습니다.

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 건강 안내 도우미 "건강이" |
| 개발 기간 | 2025.05.20 ~ 2025.06.30 |
| 대상 사용자 | 고령층(60대 이상), 디지털 소외 계층 |
| 핵심 가치 | 자연어 증상 입력 → 지역 기반 병원·진료과 즉시 추천 |

---

## 2. 팀 구성 및 역할

| 이름 | 역할 | 주요 담당 업무 |
|------|------|----------------|
| **한수창** | 팀장 / Front-end Lead | 프로젝트 총괄, 챗봇 UX 설계, FE↔BE API 연동 |
| 송현용 | Frontend | React Native 화면 개발, PPT 제작 |
| 이현서 | Backend | FastAPI 서버 구축, NLP 기반 증상 분석 및 병원 추천 API 개발 |
| 윤여진 | 기획 / 개발 보조 | 학습 자료 수집, 문서 정리, PPT 제작 |

---

## 3. 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | React Native 0.79, Expo 53, TypeScript, expo-router, expo-speech (TTS) |
| **Backend** | FastAPI, Pydantic, Pandas, Python 3.13 |
| **NLP / 자연어 처리** | soynlp `LTokenizer`, 유사어 사전(CSV), 증상–진료과 매핑 테이블 |
| **데이터** | 공공데이터포털 병원 정보(`hospital_data.csv`, 약 8,800행) |
| **통신** | JSON REST API, ngrok (모바일 실기기 터널링) |
| **협업** | GitHub, Sublime Text / VS Code |

---

## 4. 시스템 구조

```
┌────────────────────────────────────┐
│  사용자 입력 (자연어 + 지역)        │
│  ex) "무릎이 아파요, 대전, 서구"    │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│  React Native + Expo (Frontend)    │
│  - 채팅 UI / TTS / 다크모드         │
│  - Platform.OS 분기 서버 URL        │
└────────────┬───────────────────────┘
             │  POST /recommend {message, location}
             ▼
┌────────────────────────────────────┐
│  FastAPI 서버 (Backend)            │
│  ├─ soynlp 토크나이저로 띄어쓰기 교정│
│  ├─ 유사어 사전 매핑 (multi_synonym)│
│  ├─ 증상 → 진료과 분류 (2단계 매칭) │
│  ├─ 주소 정규화(normalize_addr)    │
│  └─ 2단계 검색: startswith → contains│
└────────────┬───────────────────────┘
             │  JSON 응답
             ▼
┌────────────────────────────────────┐
│  병원명 / 도로명주소 / 추천 진료과  │
│  말풍선 + 음성(TTS) 안내            │
└────────────────────────────────────┘
```

폴더 구조 요약:

```
hospital_chatbot_project/
├── code/
│   ├── backend/                # FastAPI 서버
│   │   ├── main.py             # API 엔드포인트 + NLP 로직 (190 LOC)
│   │   ├── hospital_data.csv   # 공공데이터 병원 목록 (~8,800행)
│   │   ├── disease_name.csv    # 질환-증상-진료과 매핑 (101건)
│   │   ├── synonym.csv         # 원본 유사어 사전
│   │   └── synonym_normalized.csv  # 정규화 유사어 사전 (250건)
│   └── frontend/               # React Native (Expo) 앱
│       ├── app/(tabs)/home.tsx  # 홈 화면
│       ├── app/(tabs)/chat.tsx  # 채팅 화면
│       ├── components/speakText.ts  # TTS 래퍼
│       └── context/ThemeContext.tsx # 다크/라이트 모드
├── proposals/                  # 주차별 품의서
├── meetings/                   # 주차별 회의록
├── reports/                    # 중간/결과 보고서 + 시연 영상
└── expenses/                   # 지출 결과서
```

---

## 5. 주요 기능

**① 자연어 증상 입력 기반 진료과 매칭**
"무릎이 아파요"처럼 자연어 문장을 받아 `soynlp.LTokenizer`로 토큰화한 뒤, 유사어 사전을 통해 표준 증상명으로 환산하고 해당 진료과를 추출합니다.

**② 2단계 증상 매핑 로직** (`main.py`)
1단계로 `disease_name.csv`의 "주요 증상"에 직접 매칭, 실패 시 2단계로 `synonym_normalized.csv` 유사어를 거쳐 재시도합니다. 진료과 괄호 주석은 정규식으로 제거하여 매칭 정확도를 높였습니다.

**③ 주소 정규화 + 2단계 검색**
`normalize_addr()`로 광역시/특별시·공백·숫자·특수문자를 제거하여 한글만 남긴 후, `startswith` 우선 검색 → 결과 없으면 `contains`로 확장하는 fallback 전략을 적용했습니다.

**④ 대학교병원 Fallback**
입력 증상에 해당하는 병원이 지역 내 없을 경우 자동으로 해당 지역 대학교병원을 추천합니다.

**⑤ 고령층 친화 UI**
큰 글씨(18pt+), 말풍선 채팅, **TTS 음성 안내 on/off**, **다크/라이트 모드** 토글을 제공합니다.

**⑥ 모바일 환경 자동 분기**
`Platform.OS`로 Android(`10.0.2.2:8000`) / iOS(`localhost:8000`) 서버 주소를 자동 분기합니다.

---

## 6. API 명세

### `POST /recommend`

요청
```json
{
  "message": "무릎이 아파요",
  "location": "대전 서구"
}
```

응답 (정상)
```json
{
  "recommendations": [
    {
      "name": "○○정형외과의원",
      "location": "대전광역시 서구 ○○로 123",
      "matched_department": ["정형외과"]
    }
  ],
  "matched_department": ["정형외과"]
}
```

응답 (대학교병원 fallback / 결과 없음)
```json
{
  "recommendations": [
    {
      "name": null,
      "location": "대전 서구",
      "matched_department": ["'무릎이 아파요' 증상에 해당하는 진료과와 '대전 서구' 지역의 대학교병원을 찾을 수 없습니다."]
    }
  ]
}
```

### `GET /`
헬스체크. `{"message": "백엔드 서버가 정상적으로 작동합니다!"}` 반환.

---

## 7. 팀장으로서 주요 기여 (한수창)

**챗봇 설계 및 API 인터페이스 정의**
프론트엔드(React Native)와 백엔드(FastAPI) 사이 `/recommend` 요청·응답 스키마를 사전 합의하여 병렬 개발을 가능하게 했습니다. 입력 포맷 오류(쉼표 미사용 등)에는 봇이 자동 안내 메시지를 출력하도록 예외 처리를 설계했습니다.

**기술적 문제 해결**
- **모바일 백엔드 연결 오류**: Android/iOS 환경에서 로컬 주소 처리 방식이 달라 응답이 오지 않던 문제를 `Platform.OS` 분기와 ngrok 퍼블릭 터널링 도입으로 해결.
- **TTS 중복 재생**: 챗봇 응답이 연속될 때 음성이 겹치는 문제를 `stopTTS()` 강제 호출과 `useFocusEffect` 화면 이탈 시 자동 종료 로직으로 개선.
- **다크모드 미적용 화면**: `ThemeContext` 구조를 정비해 전 화면 일관 적용.
- **자연어 키워드 매칭 정확도 저하**: soynlp 기반 불용어 처리 + 증상-진료과 매핑 로직을 개선하여 분류 정확도 향상.

**프로젝트 매니지먼트**
주 2~4회 정기 회의, 팀원 코드 리뷰 및 GitHub 기반 최종 병합을 직접 관리했습니다.

---

## 8. 프로젝트 성과

| 지표 | 수치 |
|------|------|
| 프론트엔드 코드 | 약 1,200 LOC, 화면 2개 (홈 / 채팅) |
| 백엔드 코드 | Python 약 950 LOC (총 1,350 LOC) |
| 백엔드 REST 엔드포인트 | 6개 구현 |
| 단위/통합 테스트 | 22건, 성공률 100% |
| 기능 테스트 성공률 | 약 95% |
| 증상 → 진료과 분류 정확도 | 88% |
| 병원 추천 응답 속도 (p95) | 0.5초 |
| 사용자 만족도 (SUS) | 84 / 100 |
| 추천 결과 긍정 응답 | 89% |

시연 영상은 `reports/report_assets/` 경로에서 확인할 수 있습니다.
- `01_첫화면_성공영상.mp4`
- `02_프론트엔드_다크모드.mp4`
- `03_자동응답_채팅.mp4`

---

## 9. 실행 방법

### 백엔드
```bash
cd code/code/backend
pip install fastapi uvicorn pandas soynlp pydantic
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 프론트엔드
```bash
cd code/frontend
npm install
npx expo start
```

### 모바일 실기기 테스트
1. 백엔드를 ngrok으로 퍼블릭 터널링
   ```bash
   ngrok http 8000
   ```
2. `app/(tabs)/chat.tsx`의 `getServerUrl()` 반환값을 ngrok URL로 교체
3. Expo Go 앱에서 QR 스캔 후 실행

---

## 10. 기대효과 및 활용방안

**사용자 측면**
복잡한 병원 검색 없이 한 번의 자연어 입력으로 가까운 병원과 진료과를 받아볼 수 있어 디지털 소외를 해소합니다. 음성 안내로 글 읽기가 어려운 사용자도 이해하기 쉽습니다.

**기관 측면**
- 노인복지관, 경로당, 보건소 등 공공시설 키오스크·태블릿 설치
- 직원 응대 부담 경감 및 사용자 편의 증가

**확장 가능성**
- 규칙 기반 매핑 → LLM 연동(질의응답 고도화)
- 모바일 앱 → 웹 버전 / 키오스크 멀티플랫폼 배포
- AI 윤리·접근성 디자인 후속 연구 기초자료로 활용

---

## 11. 데이터 출처

- 병원 정보: 공공데이터포털 인허가 의료기관 데이터
- 질환·증상·진료과 매핑: `disease_name.csv` (101건 자체 구축)
- 유사어 사전: `synonym_normalized.csv` (250건 자체 구축, soynlp 기반 정규화)

이미지 출처
- React Native: https://ejko0911.medium.com/react-react-native-3b62854ea073
- Expo: https://koderspedia.com/language_slider/expo/
- FastAPI: https://withcodeexample.com/getting-started-with-python-fastapi-a-comprehensive-guide/
- Pandas: https://namu.wiki/w/Pandas
