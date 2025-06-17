from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import re
from collections import defaultdict
from soynlp.tokenizer import LTokenizer
from fastapi.middleware.cors import CORSMiddleware

# ——— 주소 정규화 함수 ———
def normalize_addr(addr: str) -> str:
    """
    1) 숫자·공백·특수문자 제거 → 한글만 남기기
    2) '광역시', '특별시' 제거
    ex) "대전광역시 서구 관저동 123-45" → "대전서구관저동"
    """
    s = re.sub(r'[^가-힣]', '', addr)
    for unit in ("광역시", "특별시"):
        s = s.replace(unit, "")
    return s

# FastAPI 앱 초기화
app = FastAPI()
tokenizer = LTokenizer()

# CORS 설정
origins = [
    "http://localhost",
    "http://localhost:8081",
    "exp://jf_xmqa-anonymous-8081.exp.direct",
    "http://127.0.0.1",
    "http://127.0.0.1:8081",
    "exp://203.237.143.121:8081",
    # 실제 배포 도메인 추가...
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ——— 데이터 로드 ———
hospital_data = pd.read_csv("hospital_data.csv", encoding="cp949")
hospital_data = hospital_data[hospital_data["상세영업상태명"] == "영업중"]
hospital_data = hospital_data[["사업장명", "의료기관종별명", "진료과목내용명", "도로명전체주소"]]
hospital_data.columns = ["name", "type", "category", "location"]

disease_data = pd.read_csv("disease_name.csv", encoding="utf-8")

synonym_df = pd.read_csv("synonym_normalized.csv", encoding="utf-8")
multi_synonym_map = defaultdict(set)
for _, row in synonym_df.iterrows():
    standard = str(row["표준 증상명"]).strip()
    for syn in str(row["유사어 예시"]).split(","):
        syn = syn.strip()
        if syn:
            multi_synonym_map[syn].add(standard)

# ——— Pydantic 모델 ———
class UserInput(BaseModel):
    message: str
    location: str

# ——— NLP 유틸 함수 ———
def correct_spacing(text: str) -> str:
    try:
        tokens = tokenizer.tokenize(text, flatten=True)
        return " ".join(tokens)
    except:
        return text

def extract_keywords_from_input(user_input: str) -> list:
    tokens = tokenizer.tokenize(user_input)
    return [tok.strip() for tok in tokens if tok.strip() in multi_synonym_map]

def extract_departments_from_symptom(symptom_input: str) -> list:
    matched = []
    # 1단계: 주요 증상 직접 매칭
    for _, row in disease_data.iterrows():
        symptoms = [s.strip() for s in str(row["주요 증상"]).split(",")]
        if any(symptom_input.strip() in s for s in symptoms):
            depts = [re.sub(r"\([^)]*\)", "", d).strip()
                     for d in str(row["추천 진료과"]).split(",")]
            matched.extend(depts)
    if matched:
        return list(set(matched))
    # 2단계: 유사어 매핑
    keywords = extract_keywords_from_input(symptom_input)
    resolved = set()
    for kw in keywords:
        resolved.update(multi_synonym_map[kw])
    for res in resolved:
        for _, row in disease_data.iterrows():
            symptoms = [s.strip() for s in str(row["주요 증상"]).split(",")]
            if any(res in s for s in symptoms):
                depts = [re.sub(r"\([^)]*\)", "", d).strip()
                         for d in str(row["추천 진료과"]).split(",")]
                matched.extend(depts)
    return list(set(matched))

# ——— 병원 추천 함수 (2단계 검색 전략) ———
def get_matching_hospitals(location: str, departments: list) -> list:
    strict_results = []
    flexible_results = []
    user_norm = normalize_addr(location)

    for _, row in hospital_data.iterrows():
        db_norm = normalize_addr(row["location"])

        # 진료과 매칭 여부 확인
        raw_depts = [d.strip() for d in str(row["category"]).split(",")]
        hospital_depts = [re.sub(r"\([^)]*\)", "", d).strip() for d in raw_depts]
        matched = [d for d in departments if d in hospital_depts]
        if not matched:
            continue

        entry = {
            "name": row["name"],
            "location": row["location"],
            "matched_department": matched
        }

        # 1단계: 주소 앞부분 startswith
        if db_norm.startswith(user_norm):
            strict_results.append(entry)
        # 2단계: 주소 포함관계 contains
        elif user_norm in db_norm:
            flexible_results.append(entry)

    return strict_results if strict_results else flexible_results

# ——— 대학교병원 Fallback (2단계 검색 전략) ———
def get_university_hospitals_by_location(location: str) -> list:
    user_norm = normalize_addr(location)

    strict_df = hospital_data[
        hospital_data["name"].str.contains("대학교병원", na=False) &
        hospital_data["location"].apply(normalize_addr).str.startswith(user_norm)
    ]
    if not strict_df.empty:
        df = strict_df
    else:
        df = hospital_data[
            hospital_data["name"].str.contains("대학교병원", na=False) &
            hospital_data["location"].apply(normalize_addr).str.contains(user_norm)
        ]

    results = []
    for _, row in df.iterrows():
        results.append({
            "name": row["name"],
            "location": row["location"],
            "matched_department": ["기본 추천 (대학교병원)"]
        })
    return results

# ——— API 엔드포인트 ———
@app.get("/")
def read_root():
    return {"message": "백엔드 서버가 정상적으로 작동합니다!"}

@app.post("/recommend")
def recommend(user: UserInput):
    try:
        msg = correct_spacing(user.message)
        depts = extract_departments_from_symptom(msg)

        if depts:
            recs = get_matching_hospitals(user.location, depts)
            if recs:
                return {"recommendations": recs, "matched_department": depts}

        # fallback
        fallback = get_university_hospitals_by_location(user.location)
        if fallback:
            return {"recommendations": fallback}

        # 결과 없음
        return {
            "recommendations": [{
                "name": None,
                "location": user.location,
                "matched_department": [
                    f"'{user.message}' 증상에 해당하는 진료과와 '{user.location}' 지역의 대학교병원을 찾을 수 없습니다."
                ]
            }]
        }
    except Exception as e:
        return {"error": str(e)}
