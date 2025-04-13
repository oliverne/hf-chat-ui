# 사내 챗봇 자체 호스팅 전략

이 문서는 Hugging Face의 Chat UI 프로젝트를 사내 챗봇으로 전환하여 자체 호스팅하기 위한 전략과 수정 사항을 제시합니다.

## 목차

1. [브랜딩 및 UI 변경](#1-브랜딩-및-ui-변경)
2. [API 연동 수정](#2-api-연동-수정)
3. [인증 시스템 변경](#3-인증-시스템-변경)
4. [자체 호스팅 구성](#4-자체-호스팅-구성)
5. [외부 의존성 제거](#5-외부-의존성-제거)
6. [모델 설정 전략](#6-모델-설정-전략)
7. [데이터 프라이버시](#7-데이터-프라이버시)
8. [구현 로드맵](#8-구현-로드맵)

## 1. 브랜딩 및 UI 변경

### 브랜딩 자산
- `static/yourcompany/` 디렉토리 생성 후 다음 파일 추가:
  - 로고: `logo.svg`
  - 파비콘: `favicon.svg`, `favicon.ico`
  - 앱 아이콘: `icon-128x128.png`, `icon-256x256.png`, `icon-512x512.png`
  - 메타 이미지: `thumbnail.png`
  - 앱 매니페스트: `manifest.json`

### 환경 설정
`.env.local` 파일에 다음 설정 추가:
```
PUBLIC_APP_NAME=회사명Chat
PUBLIC_APP_ASSETS=yourcompany
PUBLIC_APP_COLOR=blue
PUBLIC_APP_DESCRIPTION="회사 내부 지식 기반 AI 어시스턴트"
```

### 수정이 필요한 파일
- `/src/lib/components/icons/LogoHuggingFaceBorderless.svelte`: 회사 로고로 대체
- `/src/lib/utils/isHuggingChat.ts`: 불필요한 체크 로직 제거 또는 회사 내부 체크로 변경
- `/src/routes/+layout.svelte`: 메타태그 및 브랜딩 관련 설정 변경

## 2. API 연동 수정

### Hugging Face API 의존성 제거
- `HF_TOKEN`, `HF_API_ROOT` 등 허깅페이스 관련 환경 변수 제거
- `/src/lib/server/models.ts` 파일에서 Hugging Face 모델 목록 조회 부분 제거 또는 수정

### 자체 모델 설정
- `models/` 디렉토리에 자체 모델 정의 파일 추가 (JSON 형식)
```json
{
  "id": "company-llm",
  "name": "Company LLM",
  "displayName": "회사 LLM",
  "description": "사내 지식에 최적화된 대규모 언어 모델",
  "endpoints": [
    {
      "type": "openai",
      "baseURL": "http://internal-llm-server:8000/v1",
      "defaultQuery": {},
      "defaultHeaders": {
        "Authorization": "Bearer $INTERNAL_API_KEY"
      }
    }
  ]
}
```

### 엔드포인트 구성
`.env.local`에 자체 모델 서버 연결 정보 설정:
```
# OpenAI 호환 API 사용 시
ENDPOINT_TYPE=openai
ENDPOINT_URL=http://internal-llm-server:8000
OPENAI_API_KEY=your_internal_api_key

# 또는 다른 타입의 엔드포인트
ENDPOINT_TYPE=llamacpp
ENDPOINT_URL=http://llama-server:8080
```

## 3. 인증 시스템 변경

### 인증 옵션
1. **쿠키 기반 기본 인증**:
   - 별도 설정 없이 사용 (기본)
   - 세션 관리는 MongoDB에 저장

2. **회사 내부 OpenID Connect 연동**:
   ```
   AUTH_ENABLED=true
   AUTH_PROVIDER=openid
   AUTH_SECRET=random_secret_key
   AUTH_OPENID_ISSUER=https://company-auth-server/.well-known/openid-configuration
   AUTH_OPENID_CLIENT_ID=client_id
   AUTH_OPENID_CLIENT_SECRET=client_secret
   ```

3. **특정 도메인 제한**:
   ```
   AUTH_DOMAINS=yourcompany.com,company.local
   ```

### 인증 통합
`/src/lib/server/auth.ts` 파일 수정:
- 회사 인증 시스템에 맞게 로그인 및 세션 관리 로직 조정
- 사용자 정보 필드를 회사 내부 시스템에 맞게 수정

## 4. 자체 호스팅 구성

### 데이터베이스 설정
```
# MongoDB 연결 설정
MONGODB_URL=mongodb://internal-mongodb:27017
MONGODB_DB_NAME=company-chat
MONGODB_DIRECT_CONNECTION=true

# 또는 인메모리 DB 사용 (개발/테스트 환경)
# MONGO_STORAGE_PATH=/path/to/storage
```

### 도커 배포
```bash
# 도커 이미지 빌드
docker build -t company-chat-ui:latest \
  --build-arg PUBLIC_APP_NAME="회사명Chat" \
  --build-arg PUBLIC_APP_ASSETS=yourcompany \
  --build-arg PUBLIC_APP_COLOR=blue .

# 도커 컨테이너 실행
docker run -d -p 3000:3000 \
  --env-file .env.local \
  --name company-chat \
  company-chat-ui:latest
```

### 쿠버네티스 배포
- `/chart` 디렉토리의 Helm 차트 활용
- `values.yaml` 파일 설정 조정
- 시크릿 관리 방식 검토 (Infisical 또는 내부 시크릿 관리 도구)

## 5. 외부 의존성 제거

### package.json 수정
다음 패키지 제거 고려:
- `@huggingface/hub`
- `@huggingface/inference`
- `@huggingface/transformers` (필요한 경우 유지)

### API 호출 리디렉션
- 허깅페이스 API를 호출하는 코드 식별 및 내부 서비스로 대체
- 웹 검색 기능을 사용할 경우 내부 검색 엔진 연동 고려

## 6. 모델 설정 전략

### 로컬 모델 호스팅 옵션
1. **OpenAI 호환 API**:
   - LiteLLM, vLLM 등을 활용한 호환 API 배포
   - API 키 및 모델 ID 설정으로 기존 코드 최소 변경

2. **경량화 모델 서버**:
   - Ollama, LLaMA.cpp 등을 통한 경량 모델 서버 구축
   - 하드웨어 요구사항 감소, 응답 시간 최적화

3. **TGI(Text Generation Inference)**:
   - HuggingFace의 TGI를 자체 서버에 호스팅
   - 고성능 모델 서빙과 최적화된 토큰화 제공
   - TGI는 Hugging Face의 최적화된 추론 서버로, 다음과 같은 장점이 있습니다:
      - 효율적인 텍스트 생성 처리
      - 스트리밍 지원
      - 토큰화 및 디토큰화 내장
      - 다양한 모델 지원
      - 높은 처리량과 낮은 지연시간
      - 자체 서비스로 마이그레이션할 때는 TGI를 직접 호스팅하거나 유사한 기능을 제공하는 대체 서비스를 구현해야 합니다.kkk
   - TGI는 주로 다음 경우에 필요합니다:
      - Hugging Face의 모델을 직접 호스팅할 때
      - 자체 언어 모델을 배포할 때
      - Hugging Face의 추론 API를 사용할 때
      - Azure OpenAI는 이미 최적화된 추론 서버를 제공하므로 별도의 TGI 설정이 필요하지 않습니다.

### 사내 지식 통합
- RAG(Retrieval-Augmented Generation) 시스템 구축
- 회사 내부 문서, Wiki, 코드베이스 등 연동
- 임베딩 모델 및 벡터 저장소 설정

## 7. 데이터 프라이버시

### 데이터 보안
- 모든 사용자 대화는 사내 DB에만 저장
- 회사 외부로 데이터 전송되지 않는지 확인
  - 분석 서비스 제거
  - 외부 API 콜백 제거
  - 모델 호출 시 데이터 보안 검토

### 데이터 삭제 정책
- 정기적인 데이터 정리 또는 보관 정책 수립
- 사용자가 자신의 대화 기록을 관리할 수 있는 옵션 제공
- 컴플라이언스 요구사항에 따른 데이터 보존 설정

### 암호화
- 데이터베이스 암호화 설정
- API 통신 TLS/SSL 적용
- 중요 데이터 필드 추가 암호화 고려

## 8. 구현 로드맵

### 1단계: 기본 구성 변경
- 브랜딩 및 UI 요소 변경
- 환경 설정 파일 구성
- 허깅페이스 API 의존성 제거

### 2단계: 모델 통합
- 자체 호스팅 모델 서버 설정
- 모델 정의 파일 생성
- 모델 연동 테스트

### 3단계: 인증 및 보안
- 회사 인증 시스템 연동
- 데이터 암호화 구현
- 접근 제어 및 사용자 권한 설정

### 4단계: 내부 지식 통합
- RAG 시스템 구축
- 회사 문서 및 데이터 소스 연동
- 질의응답 최적화

### 5단계: 배포 및 확장
- 도커 이미지 빌드 및 배포
- 모니터링 시스템 설정
- 확장성 및 고가용성 구성

---

## 참고 자료

- [Chat UI 개발 문서](./DEVELOPMENT.md)
- [Docker 배포 가이드](../docs/source/installation/docker.md)
- [모델 구성 가이드](../docs/source/configuration/models/overview.md)
- [인증 설정 가이드](../docs/source/configuration/open-id.md)