// ===============================================
// lme.js : LME 금속 시세 그래프 모듈 (최신 API 대응 버전)
// ===============================================

// -----------------------------------------------
// 1) 금속 히스토리 API 로드 (2024~2025 API 구조 자동 처리)
// -----------------------------------------------
async function loadLmeHistory(metal = "copper", months = 3) {
  // 오늘과 N개월 전 날짜 계산
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  const fmt = d => d.toISOString().split("T")[0];
  const url = `https://api.metals.live/v1/spot/history/${metal}`;

  const r = await fetch(url);
  const json = await r.json();

  // 다양한 API 응답 구조를 처리
  const rows = json
    .map(row => {
      // CASE 1: [ "2024-05-10", 385.44 ]
      if (Array.isArray(row)) {
        return {
          date: row[0],
          price: Number(row[1])
        };
      }
      // CASE 2: { time: "2024-05-10", price: 385.44 }
      if (row.time && row.price) {
        return {
          date: row.time,
          price: Number(row.price)
        };
      }
      // CASE 3: { timestamp: 1715299200000, copper: 385.44 } 등
      if (row.timestamp && row[metal]) {
        return {
          date: new Date(row.timestamp).toISOString().split("T")[0],
          price: Number(row[metal])
        };
      }
      return null;
    })
    .filter(Boolean);

  // 지정 기간으로 필터링
  return rows.filter(row => row.date >= fmt(start) && row.date <= fmt(end));
}

// -----------------------------------------------
// 2) Chart 객체 저장
// -----------------------------------------------
let lmeChart = null;

// -----------------------------------------------
// 3) LME 그래프 그리기
// -----------------------------------------------
export async function drawLmeChart({
  metal = "copper",
  months = 3,
  canvasId = "chartLME"
} = {}) {
  const data = await loadLmeHistory(metal, months);
  const ctx = document.getElementById(canvasId);

  if (!ctx) {
    console.warn("LME 차트를 그릴 캔버스를 찾을 수 없습니다:", canvasId);
    return;
  }
  if (!data || data.length === 0) {
    console.warn("LME 데이터를 찾을 수 없습니다:", metal);
    return;
  }

  // 기존 차트가 있으면 파괴
  if (lmeChart) lmeChart.destroy();

  lmeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: `${metal.toUpperCase()} (${months}M)`,
        data: data.map(d => d.price),
        borderWidth: 2,
        borderColor: "rgb(59,130,246)",      // 파란색
        backgroundColor: "rgba(59,130,246,0.15)",
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          ticks: {
            callback: v => v.toLocaleString()  // 숫자 천 단위 구분
          }
        }
      }
    }
  });
}

// -----------------------------------------------
// 4) 금속 / 기간 선택 컨트롤러 초기화
// -----------------------------------------------
export function initLmeController({
  metalSelector = "lmeMetal",
  periodSelector = "lmePeriod",
  canvasId = "chartLME"
} = {}) {
  const mSel = document.getElementById(metalSelector);
  const pSel = document.getElementById(periodSelector);
  if (!mSel || !pSel) {
    console.warn("LME 셀렉터 요소를 찾을 수 없습니다.");
    return;
  }

  // 초기 차트 렌더링
  drawLmeChart({
    metal: mSel.value,
    months: Number(pSel.value),
    canvasId
  });

  // 금속 종류 변경 시 재렌더링
  mSel.addEventListener("change", () => {
    drawLmeChart({
      metal: mSel.value,
      months: Number(pSel.value),
      canvasId
    });
  });

  // 기간 변경 시 재렌더링
  pSel.addEventListener("change", () => {
    drawLmeChart({
      metal: mSel.value,
      months: Number(pSel.value),
      canvasId
    });
  });
}
