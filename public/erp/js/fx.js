// ===============================================
// fx.js : 환율 데이터 + 환율 그래프 관리 모듈
// ===============================================

// -----------------------------------------------
// 1) 네이버 월별 환율 API (기본)
// -----------------------------------------------
async function loadNaverFX(symbol = "USDKRW", months = 12) {
  const url = `https://api.finance.naver.com/siseJson.naver?symbol=${symbol}&requestType=month`;
  const r = await fetch(url);
  const t = await r.text();

  // 네이버 특유의 'JSON → "로 치환
  const data = JSON.parse(t.replace(/\'/g, '"'));

  return data.slice(1).slice(-months).map(row => ({
    ym: row[0],         // YYYYMM
    close: Number(row[1])
  }));
}

// -----------------------------------------------
// 2) 차트 저장용 변수
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

  const data = await loadNaverFX(symbol, months);
  const ctx = document.getElementById(canvasId);

  if (!ctx) {
    console.warn("환율 차트 canvas(id=chartFx)를 찾을 수 없습니다.");
    return;
  }

  // 이미 차트가 있으면 삭제 (그래야 갱신됨)
  if (fxChart) {
    fxChart.destroy();
  }

  fxChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.ym),
      datasets: [{
        label: symbol,
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
          ticks: {
            callback: v => v.toLocaleString()
          }
        }
      }
    }
  });
}

// -----------------------------------------------
// 4) 통화 + 기간 컨트롤러 지원 함수
// -----------------------------------------------
export function initFxController({
  currencySelector = "fxCurrency",
  periodSelector = "fxPeriod",
  canvasId = "chartFx"
} = {}) {

  const curSel = document.getElementById(currencySelector);
  const perSel = document.getElementById(periodSelector);

  if (!curSel || !perSel) {
    console.warn("환율 컨트롤 요소를 찾지 못했습니다.");
    return;
  }

  // 초기 그래프 로딩
  drawFxChart({
    symbol: curSel.value,
    months: Number(perSel.value),
    canvasId
  });

  // 통화 변경 → 그래프 갱신
  curSel.addEventListener("change", () => {
    drawFxChart({
      symbol: curSel.value,
      months: Number(perSel.value),
      canvasId
    });
  });

  // 기간 변경 → 그래프 갱신
  perSel.addEventListener("change", () => {
    drawFxChart({
      symbol: curSel.value,
      months: Number(perSel.value),
      canvasId
    });
  });
}
