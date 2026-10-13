# ⏱️ DayLog - 앱 사용 시간 기록 및 데일리 생산성 분석 시스템

> **Antigravity Pro 스타일의 모던 웹 애플리케이션 프로토타입**  
> 사용자가 직접 애플리케이션 사용 시간을 기록하고, 주간 7일 막대 리포트와 핵심 생산성 지표(연속 기록일, 최다 사용 앱, 일일 목표 시간 달성률)를 분석할 수 있는 안전한 **로컬 저장 우선(Local-First)** 시스템입니다.

---

## 🌟 주요 핵심 기능

1. **애플리케이션 선택 및 커스텀 등록**
   - 사전 탑재 프리셋 앱 (VS Code, Chrome, Figma, Slack, Notion, Terminal, YouTube 등)
   - 앱 칩(Pill)을 통한 원클릭 빠른 선택
   - 사용자 정의 앱 추가 모달 (이름, 카테고리, 8색 전용 컬러 팔레트)

2. **이중 시간 기록 모드 (실시간 타이머 & 수동 입력)**
   - **실시간 스톱워치 타이머**: 시작/일시정지/초기화 기능 및 상단 내비게이션 바에 실시간 틱(Ticker) 표시
   - **수동 시간 입력**: 날짜 선택, 분 단위 입력, 또는 시작/종료 시각 입력 시 소요 시간(분) 자동 계산

3. **마크다운(Markdown) 세부 작업 메모 & 일기**
   - 제목 및 마크다운 문법 지원 (체크리스트, 헤더, 볼드, 코드 블록, 인라인 코드 등)
   - 작성 모드와 실시간 미리보기 탭 토글

4. **7일 주간 리포트 (인터랙티브 SVG 막대 그래프)**
   - 최근 7일간의 사용 시간(h)을 인터랙티브 SVG 바 차트로 시각화
   - 특정 날짜 막대를 클릭하여 해당 일자의 세부 기록만 즉시 필터링 가능

5. **핵심 통계 지표 (KPIs)**
   - **오늘 총 사용 시간**: 오늘 누적된 사용 시간 및 총 세션 수
   - **일일 목표 사용 시간 알림/게이지**: 목표 대비 진행률(%) 및 초과/적정 피드백
   - **주간 일평균 사용 시간**: 최근 7일 기준 평균 일일 사용량
   - **최다 사용 앱 (Top 1)**: 가장 긴 시간을 사용한 앱과 누적 시간
   - **연속 기록 달성일 (Streak 🔥)**: 연속 기록 일수 자동 계산

6. **검색, 필터링 및 다중 정렬**
   - 실시간 검색어 필터 (앱 이름, 작업명, 마크다운 본문, 태그 통합 검색)
   - 앱별 필터 드롭다운
   - 태그 클릭 시 단일 태그 필터링 및 해제
   - 정렬: 날짜 최신순 / 과거순, 사용 시간 긴 순 / 짧은 순, 앱 이름순(A-Z)

7. **보안 & 데이터 주권**
   - **4자리 PIN 화면 잠금**: 글래스모피즘 숫자 키패드 및 진동/흔들림 오류 피드백
   - **로컬 암호화 토글**: 클라이언트 인코딩을 통한 localStorage 보관
   - **100% 로컬 저장**: 외부 서버 전송 일절 없음 (Privacy First)
   - **JSON 백업 & 복원**: 전체 데이터 내보내기/가져오기 완벽 지원
   - **확인 창(Confirmation Dialog)**: 기록 삭제 및 데이터 초기화 시 안전 확인

8. **PWA (Progressive Web App) 오프라인 지원**
   - `manifest.json`, `sw.js` (Service Worker) 및 고해상도 벡터 아이콘 탑재
   - 네트워크 연결 없이도 브라우저에서 독립 실행 가능

---

## 📂 파일 구조

```
daylog/
├── daylog-improved.html       # 메인 애플리케이션 마크업 (시맨틱 구조 & 접근성)
├── daylog-improved.css        # Antigravity 글래스모피즘 디자인 시스템 & 반응형
├── app-daylog.js              # 상태 관리, 타이머, 차트 엔진, 보안 로직
├── manifest.json              # PWA 매니페스트
├── sw.js                      # 오프라인 캐싱 서비스 워커
├── icon.svg                   # 앱 고해상도 벡터 아이콘
├── README.md                  # 프로젝트 설명서 (본 문서)
├── PRIVACY_POLICY_TEMPLATE.md # 개인정보처리방침 전문
├── CONTRIBUTING.md            # 기여 가이드라인
├── package.json               # 로컬 실행 스크립트 정의
└── docs/
    ├── DEVELOPMENT.md         # 개발자 아키텍처 및 확장 가이드
    └── PR_TEMPLATE.md         # 풀 리퀘스트 템플릿
```

---

## 🚀 로컬 실행 방법

별도의 복잡한 빌드 단계 없이 웹 브라우저에서 바로 열거나 간이 웹 서버를 통해 실행할 수 있습니다.

### 방법 1: 브라우저에서 직접 열기
- 탐색기에서 `daylog-improved.html` 파일을 더블 클릭하여 실행합니다.

### 방법 2: 로컬 HTTP 서버 실행 (권장, PWA 및 서비스 워커 테스트)
```bash
# npx http-server 실행 (또는 python -m http.server 8080)
npx -y http-server . -p 8080 -c-1
```
이후 웹 브라우저에서 `http://localhost:8080/daylog-improved.html` 로 접속합니다.

---

## 🔍 실행 확인 및 콘솔 로그 체크리스트

1. `daylog-improved.html`, `daylog-improved.css`, `app-daylog.js` 파일이 동일 디렉터리에 존재하는지 확인
2. 브라우저 개발자 도구(F12)의 **콘솔(Console)** 탭에서 다음 로드 메시지 확인:
   ```
   [DayLog] System Initializing... v1.0.0 Pro (Antigravity Edition)
   [DayLog] Core scripts & modules loaded.
   [DayLog] Storage state verified: X entries found.
   [DayLog] System Ready & Operational!
   [DayLog] PWA Service Worker registered successfully: ...
   ```
3. 첫 실행 시 화면이 빈 상태로 시작되며, **'✨ 예시 데이터 로드'** 버튼을 클릭하여 7일치 주간 리포트 그래프와 지표가 즉시 렌더링되는지 확인합니다.

---

## 📦 데이터 스키마 (v1)

```json
{
  "version": 1,
  "exported_at": "2026-10-13T12:00:00.000Z",
  "settings": {
    "theme": "dark",
    "dailyTargetHours": 4,
    "pinEnabled": false,
    "pinHash": "",
    "encryption": false,
    "firstRunCompleted": true
  },
  "apps": [
    { "id": "app_vscode", "name": "Visual Studio Code", "category": "개발", "color": "#007acc" }
  ],
  "entries": [
    {
      "id": "entry_m123456_abc",
      "date": "2026-10-13",
      "appId": "app_vscode",
      "appName": "Visual Studio Code",
      "title": "DayLog 프로토타입 구현",
      "content": "### 작업 일지\n- [x] UI 디자인 완성",
      "tags": ["개발", "오늘"],
      "startTime": "09:30",
      "endTime": "11:45",
      "durationMinutes": 135,
      "created_at": "2026-10-13T09:30:00.000Z",
      "edited_at": "2026-10-13T11:45:00.000Z"
    }
  ]
}
```

---

## 📄 라이선스
MIT License. 자유롭게 수정하고 확장할 수 있습니다.
