# Vercel 배포 — 수정본 1.0.1

프로젝트 루트는 package.json, vercel.json, api 폴더가 있는 beauty-support-desk 폴더입니다.

## Vercel Import Project 설정

| 항목 | 값 |
|---|---|
| Framework Preset | Other |
| Root Directory | package.json이 있는 폴더 |
| Build Command | npm run build |
| Output Directory | dist |
| Install Command | npm install --ignore-scripts --no-audit --no-fund |
| Node.js Version | 22.x |
| 환경변수 | 필요 없음 |

vercel.json에 배포 설정을 포함했습니다. 화면은 dist의 정적 파일을 사용하고, POST /api/refresh만 서버 함수로 실행합니다. 로컬 개발용 scripts/dev-server.mjs는 배포에서 제외합니다. 기존 server.mjs 파일을 남기지 마세요.

Git 저장소로 Import한 경우 이 수정본을 반영해 커밋 후 배포합니다. CLI를 사용하는 경우 프로젝트 폴더에서 `vercel --prod`로 배포할 수 있습니다.

## 배포 후 확인
1. 첫 화면에서 지원사업 목록이 표시되는지 확인합니다.
2. 직접 등록한 뒤 페이지를 새로 열어 저장 여부를 확인합니다.
3. 수집 기관 탭에서 한 기관을 새로고침합니다. 기관 연결 실패는 화면에 표시하며 전체 화면 오류로 이어져서는 안 됩니다.

로그인 화면이 뜨는 것은 FUNCTION_INVOCATION_FAILED 오류와 별개의 Vercel 배포 보호 설정입니다.

## 제한
이 버전은 브라우저에 데이터를 저장합니다. 기관별 수집은 공개 HTML 제목·링크 추출 초안이며, 모든 기관의 연동이나 상세정보 자동 추출이 완료된 것은 아닙니다.
