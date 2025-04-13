# 개발 가이드

이 문서는 프로젝트 설정 및 개발에 관한 기본 정보를 제공합니다.

## 시작하기

1. 저장소 복제하기:
```bash
git clone https://github.com/huggingface/chat-ui
cd chat-ui
```

2. 로컬 환경 파일 `.env.local` 생성하기:
```
MONGODB_URL=mongodb://localhost:27017
HF_TOKEN=<허깅페이스 액세스 토큰>
PUBLIC_APP_NAME=커스텀Chat
PUBLIC_APP_ASSETS=yourcompany
PUBLIC_APP_COLOR=blue
```

3. `static/yourcompany/` 디렉토리에 필요한 에셋 파일 추가 (로고, 아이콘 등)

4. 의존성 설치 후 개발 서버 실행하기:
```bash
npm install
npm run dev
```

## 앱 커스터마이징

`.env.local` 파일에 다음 변수를 설정하여 앱을 커스터마이징할 수 있습니다:
```
PUBLIC_APP_NAME=커스텀Chat
PUBLIC_APP_ASSETS=yourcompany
PUBLIC_APP_COLOR=blue
PUBLIC_APP_DESCRIPTION="앱 설명"
PUBLIC_APP_DISCLAIMER=1
```

- 에셋 커스터마이징:
  - `static/yourcompany/` 디렉토리에 필요한 파일 추가
  - logo.svg, favicon.svg, favicon.ico 등 포함
  - `PUBLIC_APP_ASSETS=yourcompany` 설정

- 테마 색상은 Tailwind 색상을 사용 - 기본적으로 blue, red, green, yellow, purple, pink, indigo 등 사용가능.

## 배포 빌드

도커를 사용해 앱을 빌드하고 배포하려면 다음 명령어를 사용하세요:
```bash
docker build -t custom-chat-ui:latest --build-arg INCLUDE_DB=false --build-arg PUBLIC_APP_COLOR=yourcolor .
```

배포용 빌드만 생성하려면:
```bash
npm run build
```

## 프로젝트 아키텍처

### 프로젝트의 주요 목적 및 기능

Chat UI는 오픈 소스 모델(OpenAssistant, Llama 등)을 사용하는 채팅 인터페이스를 제공하는 프로젝트입니다. 이 프로젝트는 SvelteKit 앱으로 구현되었으며, [HuggingChat 앱(hf.co/chat)](https://huggingface.co/chat)을 지원하고 있습니다. 주요 기능으로는:

- 다양한 언어 모델과의 대화형 채팅 인터페이스
- 웹 검색 기능 통합
- 다양한 AI 모델 제공업체 지원 (Anthropic, OpenAI, Cloudflare, Google Vertex AI 등)
- 사용자 정의 모델 및 프롬프트 설정 가능
- 멀티모달 모델 지원 (이미지와 텍스트 함께 처리)
- 어시스턴트와 도구 기능 제공

### 기술 스택

- **프론트엔드**: SvelteKit, Tailwind CSS
- **백엔드**: Node.js
- **데이터베이스**: MongoDB (대화 내역, 사용자 설정 등 저장)
- **인증**: OpenID Connect 통합 (선택적)
- **모델 통합**: 
  - 여러 AI 모델 제공업체 지원 (Anthropic, OpenAI, Google Vertex, AWS 등)
  - 로컬 모델 지원 (llama.cpp, Ollama 등)
  - 호스팅 API 지원 (Hugging Face Inference API)
- **임베딩**: transformers.js, TEI, OpenAI 등 지원

### 주요 디렉토리 구조 및 목적

- **/src**
  - **/routes**: SvelteKit 라우트 및 앱의 주요 백엔드/프론트엔드 로직
  - **/lib**: 공통 컴포넌트 및 유틸리티
    - **/server**: 서버 측 코드
      - **/database.ts**: MongoDB 연결 및 컬렉션 관리
      - **/auth.ts**: 사용자 인증 및 세션 관리
      - **/endpoints**: 다양한 AI 모델 제공자와의 통합
      - **/embeddingEndpoints**: 텍스트 임베딩 모델 통합
      - **/textGeneration**: 모델 출력, 웹 검색 등 기능 통합
      - **/websearch**: 웹 검색 및 RAG(Retrieval-Augmented Generation) 구현
      - **/tools**: LLM이 호출하는 외부 도구 인터페이스
    - **/components**: 재사용 가능한 UI 컴포넌트
    - **/types**: TypeScript 타입 정의
    - **/stores**: Svelte 상태 관리
  - **/styles**: CSS 스타일
- **/static**: 정적 자산 (이미지, 아이콘 등)
- **/docs**: 프로젝트 문서화

### 중요한 서버 측 및 클라이언트 측 컴포넌트

#### 서버 측
- **hooks.server.ts**: 요청 처리 미들웨어, 인증, CSRF 보호
- **database.ts**: MongoDB 연결 및 컬렉션 관리 (대화, 사용자, 설정 등)
- **auth.ts**: OpenID 인증, 세션 관리, CSRF 토큰 생성
- **endpoints/**: 다양한 LLM 제공자와 통합 (Anthropic, OpenAI, Bedrock, Vertex 등)
- **textGeneration/**: 모델 출력, 웹 검색, 도구 통합

## Azure OpenAI 통합 가이드

Azure OpenAI 모델을 Chat UI에 통합하려면 다음 단계를 따르세요:

### 1. 모델 구성 파일 생성

`models/` 디렉토리에 JSON 파일(예: `azure-openai.json`)을 생성하고 다음 형식으로 구성합니다:

```json
{
  "id": "gpt-4-turbo",
  "name": "gpt-4-turbo",
  "displayName": "Azure GPT-4 Turbo",
  "parameters": {
    "temperature": 0.5,
    "max_new_tokens": 4096
  },
  "endpoints": [
    {
      "type": "openai",
      "baseURL": "https://{리소스명}.openai.azure.com/openai/deployments/{배포ID}",
      "defaultHeaders": {
        "api-key": "$AZURE_OPENAI_API_KEY"
      },
      "defaultQuery": {
        "api-version": "2023-05-15"
      }
    }
  ]
}
```

### 2. API 키 보안 관리

Azure API 키를 안전하게 관리하기 위한 방법:

1. **환경 변수 사용**:
   - `.env.local` 파일에 API 키 저장:
     ```
     AZURE_OPENAI_API_KEY=your-api-key-here
     ```
   - 모델 JSON에서 `"api-key": "$AZURE_OPENAI_API_KEY"` 형식으로 참조

2. **배포 방법별 보안**:
   - 로컬 개발: `.env.local` 파일 사용 (`.gitignore`에 포함됨)
   - Docker: `--env-file .env.local` 옵션으로 환경 변수 전달
     ```bash
     docker run -p 3000:3000 --env-file .env.local custom-chat-ui
     ```
   - Kubernetes: Helm 차트의 시크릿 관리 또는 Infisical 활용

### 3. 특별 구성 옵션

- 스트리밍을 지원하지 않는 모델(예: o1)을 위해 스트리밍 비활성화:
  ```json
  "endpoints": [
    {
      "type": "openai",
      "baseURL": "https://{리소스명}.openai.azure.com/openai/deployments/{배포ID}",
      "defaultHeaders": {
        "api-key": "$AZURE_OPENAI_API_KEY"
      },
      "defaultQuery": {
        "api-version": "2023-05-15"
      },
      "streamingSupported": false
    }
  ]
  ```

중요: API 키를 코드나 JSON 파일에 직접 하드코딩하지 마세요.

## MongoDB 사용 가이드

### MongoDB 사용 목적

Chat UI는 다음과 같은 데이터를 저장하기 위해 MongoDB를 사용합니다:

- **대화 내역(conversations)**: 사용자의 모든 채팅 대화와 메시지
- **사용자 정보(users)**: 사용자 계정 정보 및 개인 설정
- **어시스턴트(assistants)**: 커스텀 어시스턴트 구성 및 설정
- **도구(tools)**: 사용자 정의 도구 정보 및 설정
- **파일(files)**: 업로드된 파일 (GridFS 사용)
- **세션(sessions)**: 사용자 세션 데이터
- **설정(settings)**: 애플리케이션 전체 설정

### 로컬 개발을 위한 MongoDB 설정

로컬 개발 환경에서 MongoDB를 설정하는 두 가지 방법:

#### 1. Docker를 사용한 로컬 MongoDB 인스턴스 설정

```bash
# MongoDB 컨테이너 실행
docker run -d -p 27017:27017 -v mongo-chat-ui:/data --name mongo-chat-ui mongo:latest

# 컨테이너 상태 확인
docker ps
```

그 후 `.env.local` 파일에 다음 설정 추가:
```
MONGODB_URL=mongodb://localhost:27017
```

#### 2. MongoDB Atlas 사용 (클라우드 호스팅)

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)에서 무료 계정 생성
2. 새 클러스터 생성
3. 데이터베이스 액세스 사용자 생성
4. 네트워크 액세스 설정 (개발용 `0.0.0.0/0` 설정 가능)
5. 연결 문자열 복사 후 `.env.local` 파일에 추가:
   ```
   MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net
   ```

### MongoDB 구성 옵션

`.env.local` 파일에서 다음 변수를 설정하여 MongoDB 연결을 구성할 수 있습니다:

```
MONGODB_URL=mongodb://localhost:27017       # MongoDB 연결 URL
MONGODB_DB_NAME=chat-ui                     # 데이터베이스 이름 (선택 사항)
MONGODB_DIRECT_CONNECTION=true              # 직접 연결 활성화 (선택 사항)
MONGO_STORAGE_PATH=/path/to/storage         # 인메모리 MongoDB 저장 경로 (선택 사항)
```

### 대체 옵션

MongoDB 연결 URL을 제공하지 않을 경우:

- 개발 모드에서는 자동으로 `mongodb-memory-server`를 사용하여 인메모리 MongoDB 인스턴스 생성
- Docker 배포 시 내장 MongoDB 인스턴스 포함 가능:
  ```bash
  docker build -t custom-chat-ui:latest --build-arg INCLUDE_DB=true .
  ```

**참고**: 인메모리 MongoDB는 테스트 및 개발에만 적합하며, 프로덕션 환경에서는 외부 MongoDB 인스턴스 사용을 권장합니다.

#### 클라이언트 측
- **ChatWindow.svelte**: 주요 대화 인터페이스
- **ChatMessage.svelte**: 개별 메시지 렌더링
- **ModelSwitch.svelte**: 모델 전환 UI
- **MarkdownRenderer.svelte**: 마크다운 형식의 응답 렌더링
- **NavMenu.svelte**: 네비게이션 메뉴

### API 엔드포인트 구조

API 엔드포인트는 `/src/routes/api/` 디렉토리에 정의되어 있습니다:

- **/api/models**: 사용 가능한 모델 목록 제공
- **/api/conversations**: 대화 관리 (생성, 불러오기, 삭제)
- **/api/conversation/[id]**: 특정 대화 관리
- **/api/assistants**: 어시스턴트 목록 제공 및 관리
- **/api/assistant/[id]**: 특정 어시스턴트 관리
- **/api/tools**: 사용 가능한 도구 관리
- **/api/user**: 사용자 정보 및 설정 관리

### 인증 시스템

Chat UI는 다음과 같은 인증 방식을 지원합니다:

1. **Cookie 기반 세션**: 기본적으로 브라우저 기반 식별자 사용
2. **OpenID Connect**: 선택적으로 활성화 가능, `.env.local` 파일에서 구성 가능
3. **신뢰할 수 있는 헤더 인증**: 프록시와 함께 사용할 수 있는 방식 (예: Tailscale, Cloudflare Access)
4. **API 토큰 인증**: API 사용을 위한 Bearer 토큰 지원

### 기타 주목할만한 아키텍처 특징

1. **마이그레이션 시스템**: 스키마 변경에 대한 하위 호환성을 유지하기 위한 MongoDB 마이그레이션
2. **멀티모달 지원**: 이미지를 처리할 수 있는 모델 통합 (IDEFICS, Claude 3, OpenAI)
3. **WebSearch 기능**: 사용자 쿼리에서 검색 쿼리 생성, 웹 검색 수행, 웹페이지 콘텐츠 추출, 임베딩 생성, 벡터 유사도 검색을 통한 RAG 구현
4. **추론 모델 지원**: Chain-of-Thought 모델을 위한 특별한 UI 구성 가능
5. **커스텀 엔드포인트**: 다양한 형태의 LLM 서버 지원 (TGI, llama.cpp, Ollama 등)
6. **도커 배포 지원**: 쉬운 배포를 위한 도커 이미지 제공
7. **Hugging Face Spaces 통합**: 원클릭 배포 옵션 제공