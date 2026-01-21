// ===============================================
// fx.js : 환율 API (Frankfurter) + 그래프 모듈
// ===============================================

// -----------------------------------------------
// 1) Frankfurter 일별 환율 데이터 로드
//    https://api.frankfurter.app
// -----------------------------------------------
async function loadFxDaily(symbol = "USDKRW", months = 12) {
  const base = symbol.slice(0, 3);  // USD
  const quote = symbol.slice(3, 6); // KRW

  // N개월 전 날짜 계산
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  const fmt = d => d.toISOString().split("T")[0];

  const url =
    `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=${base}&to=${quote}`;

  const r = await fetch(url);
  const json = await r.json();

  return Object.entries(json.rates).map(([date, obj]) => ({
    date,
    close: obj[quote]
  }));
}

// -----------------------------------------------
// 2) 차트 저장 변수
// -----------------------------------------------
let fxChart = null;

// -----------------------------------------------
// 3) 차트 그리기
// -----------------------------------------------
export async function drawFxChart({
  symbol = "USDKRW",
  months = 12,
  canvasId = "chartFx"
} = {}) {

  const data = await loadFxDaily(symbol, months);
  const ctx = document.getElementById(canvasId);

  if (!ctx) {
    console.warn("환율 chartFx 캔버스를 찾을 수 없습니다.");
    return;
  }

  if (fxChart) fxChart.destroy();

  fxChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: `${symbol} (${months}M)`,
        data: data.map(d => d.close),
        borderWidth: 2,
        borderColor: "rgb(16,185,129)",
        backgroundColor: "rgba(16,185,129,0.15)",
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          ticks: { callback: v => v.toLocaleString() }
        }
      }
    }
  });
}

// -----------------------------------------------
// 4) 셀렉트 박스 + 기간 변경 컨트롤
// -----------------------------------------------
export function initFxController({
  currencySelector = "fxCurrency",
  periodSelector = "fxPeriod",
  canvasId = "chartFx"
} = {}) {

  const curSel = document.getElementById(currencySelector);
  const perSel = document.getElementById(periodSelector);

  if (!curSel || !perSel) {
    console.warn("환율 셀렉터를 찾지 못했습니다.");
    return;
  }

  // 초기 로딩
  drawFxChart({
    symbol: curSel.value,
    months: Number(perSel.value),
    canvasId
  });

  curSel.addEventListener("change", () => {
    drawFxChart({
      symbol: curSel.value,
      months: Number(perSel.value),
      canvasId
    });
  });

  perSel.addEventListener("change", () => {
    drawFxChart({
      symbol: curSel.value,
      months: Number(perSel.value),
      canvasId
    });
  });
}
