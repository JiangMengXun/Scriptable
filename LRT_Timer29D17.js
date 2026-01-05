/*****************************************************************
 * 🚈 LRT_Timer2 v3.3.1 FINAL STABLE (Silent Widget Edition)
 *****************************************************************/

const SCRIPT_NAME = "LRT_Timer29D17";
const VERSION = "v3.3.1";

// ✅【關鍵 1】最前面就鎖定 silent
const SILENT_RUN = args.queryParameters.silent === "true";

// ======================== 設定 ========================
const STATION_JSON_URL =
  "https://raw.githubusercontent.com/JiangMengXun/ESP32/main/stations.json";
const API_URL =
  "https://trainstatus.ntmetro.com.tw/roadmap/danhei_data.php";

// ======================== 計時 ========================
const t0 = Date.now();

// ======================== 取得 GPS + 車站 ========================
const [loc, stations] = await Promise.all([
  Location.current({ accuracy: 100 }),
  new Request(STATION_JSON_URL).loadJSON()
]);

const { latitude, longitude } = loc;

// ======================== 距離計算 ========================
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ======================== 最近車站 ========================
let nearest = stations.reduce(
  (p, c) => {
    const d = distance(latitude, longitude, c.latitude, c.longitude);
    return d < p.dist ? { ...c, dist: d } : p;
  },
  { dist: Infinity }
);
const distM = Math.round(nearest.dist);

// ======================== 營運時間 ========================
const hour = new Date().getHours();
const isClosed = hour >= 1 && hour < 4;

// =======================================================
// 即時列車資料
// =======================================================
const trainReq = new Request(API_URL);
trainReq.method = "POST";
trainReq.headers = {
  "Referer": "https://trainsmonitor.ntmetro.com.tw/",
  "Accept": "application/json",
  "Content-Type": "application/json"
};
trainReq.body = "{}";
const trainRes = await trainReq.loadJSON();
const gpsData = trainRes?.data?.gpsData ?? [];

// ======================== 方向文字 ========================
function getDirectionLabel(index, routeId) {
  if (index === 0) {
    if (routeId === 3) return "往 崁頂          🟢 ⬆️";
    if (routeId === 4) return "往 淡水漁人碼頭 🔵 ⬆️";
  } else if (index === 1) return "往 崁頂          🟢 ⬆️";
  else if (index === 2) return "往 淡水漁人碼頭 🔵 ⬆️";
  else if (index === 3) return "往 紅樹林       🟢 ⬇️";
  else if (index === 4) return "往 紅樹林       🔵 ⬇️";
  return "未知方向";
}

// ======================== Widget ========================
if (config.runsInWidget || SILENT_RUN) {
  const w = new ListWidget();
  w.backgroundColor = Color.white();

  // ✅【關鍵 2】Widget 點擊 → silent run
  w.url = "scriptable:///run?scriptName=LRT_Timer29D17&silent=true";

  const title = w.addText("🚈 淡海輕軌列車動態");
  title.font = Font.boldSystemFont(22);

  const station = w.addText(
    `📍 最近車站：${nearest.train_id} ${nearest.station_name}站`
  );
  station.font = Font.boldSystemFont(16);

  w.addText(`📏 距離：約 ${distM} 公尺`);

  const cost = ((Date.now() - t0) / 1000).toFixed(2);
  w.addText(`⏱️ ${cost}s  ${VERSION}`).font = Font.systemFont(12);

  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);

  Script.setWidget(w);

  // ✅【關鍵 3】立刻結束，不跑任何 UI
  Script.complete();
  return;
}

// ❌【重要】不再允許任何非 Widget / Notification 行為
Script.complete();
