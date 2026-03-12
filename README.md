# NotebookLM - AI 기반 학습 도구

NotebookLM은 Google Vertex AI와 Firebase를 활용하여 구축한 AI 기반 학습 및 콘텐츠 생성 플랫폼입니다. 사용자는 다양한 소스 자료를 업로드하고, AI와 상호작용하며, 자동 생성된 학습 콘텐츠를 활용할 수 있습니다.

## 주요 기능

### 콘텐츠 관리
- **소스 자료 관리**: Firebase Storage를 통한 파일 업로드 및 관리
- **노트 저장**: Firestore 데이터베이스에 학습 노트 저장
- **버전 관리**: 생성된 콘텐츠 히스토리 추적

### AI 기반 기능
- **AI 채팅**: Google Vertex AI와의 인터랙티브 대화
- **비디오 생성**: AI를 활용한 자동 비디오 콘텐츠 생성
- **슬라이드 생성**: 자동 프레젠테이션 슬라이드 생성

### 학습 도구
- **퀴즈 카드**: 대화형 퀴즈 시스템
- **플래시카드**: 암기 학습용 플래시카드
- **마인드맵**: 개념 시각화 및 구조화
- **오디오 개요**: 음성 기반 학습 자료
- **슬라이드 뷰어**: 생성된 슬라이드 재생
- **리포트**: 학습 진행도 및 분석 보고서

## 기술 스택

### Frontend
- **Framework**: Next.js 14.2.35
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3.4.1
- **PostCSS**: 8.x
- **Charts**: Recharts 3.8.0

### Backend & Services
- **Backend Framework**: Next.js API Routes
- **AI Service**: Google Cloud Vertex AI 1.10.0
- **Database**: Firebase (Firestore)
- **Storage**: Firebase Storage
- **Google APIs**: googleapis 171.4.0

### Development Tools
- **Linting**: ESLint 8.x
- **Node.js**: 필수 (v18.x 이상 권장)

## 설치 및 실행

### 필수 요구사항
- Node.js 18.x 이상
- npm 또는 yarn
- Google Cloud credentials
- Firebase 프로젝트 설정

### 설치 단계

1. **저장소 클론 및 의존성 설치**
```bash
cd next_test_001
npm install
```

2. **환경 변수 설정**
   - `google-credentials.json`: Google Cloud 서비스 계정 키
   - Firebase 설정 정보를 `src/lib/firebase.js`에 입력

3. **개발 서버 시작**
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

4. **프로덕션 빌드**
```bash
npm run build
npm start
```

## 프로젝트 구조

```text
src/
├── app/
│   ├── api/                # Vertex AI 및 백엔드 로직용 API Routes
│   │   └── chat/route.js
│   ├── components/         # 기능별 공용 컴포넌트
│   │   ├── QuizCard.jsx    # 퀴즈 기능 UI
│   │   ├── Flashcard.jsx   # 암기용 카드 UI
│   │   ├── AudioOverview.jsx
│   │   ├── SlideViewer.jsx
│   │   ├── MindmapView.jsx
│   │   └── ReportView.jsx
│   ├── page.js             # 메인 NotebookLM UI 및 채팅 화면
│   └── layout.js           # 전역 레이아웃 설정
├── lib/
│   └── firebase.js         # Firebase 초기화 및 설정
└── public/                 # 이미지, 아이콘 등 정적 파일