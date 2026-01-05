/*****************************************************************
 * 🚈 LRT_Timer2 v3.3.1 FINAL STABLE
 * - v3.2.3 為基準整合「即時列車資訊完整版」
 * - Small Widget 安全版（標題 / 距離永不消失）
 * - 方向文字可依目的地上色
 * - 每 5 分鐘自動刷新
 * - 支援捷徑 silent run
 *****************************************************************/

const SCRIPT_NAME = "LRT_Timer29D16";
const VERSION = "v3.3.1";

// ======================== 設定 ========================
const STATION_JSON_URL =
  "https://raw.githubusercontent.com/JiangMengXun/ESP32/main/stations.json";
const API_URL =
  "https://trainstatus.ntmetro.com.tw/roadmap/danhei_data.php";

const SILENT_RUN = args.queryParameters.silent === "true";

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
trainReq.body = JSON.stringify({});
const trainRes = await trainReq.loadJSON();
const gpsData = trainRes?.data?.gpsData ?? [];

// ======================== 方向文字 ========================
function getDirectionLabel(index, routeId) {
  if (index === 0) {
    if (routeId === 3) return    "往 崁頂        🟢 ⬆️";
    if (routeId === 4) return    "往 淡水漁人碼頭 🔵 ⬆️";
  } else if (index === 1) return "往 崁頂        🟢 ⬆️";
  else if (index === 2) return   "往 淡水漁人碼頭 🔵 ⬆️";
  else if (index === 3) return   "往 紅樹林    🟢 ⬇️";
  else if (index === 4) return   "往 紅樹林    🔵 ⬇️";
  else if (index === 5) {
    if (routeId === 3) return    "往 紅樹林    🟢 ⬇️";
    if (routeId === 4) return    "往 紅樹林    🔵 ⬇️";
  }
  return "未知方向";
}

// ======================== 時間格式 ========================
function formatTime(sec) {
  const min = Math.round(sec / 60);
  return `約 ${min} 分後進站`;
}
const nowHHMM = new Date().toTimeString().slice(0, 5);

// ======================== 整理列車清單 ========================
const trainList = [];
gpsData.forEach((block, idx) => {
  const info = block[nearest.train_id];
  if (!info || typeof info.time !== "number") return;

  const sec = info.time;
  if (sec > 1800) return;

  const hhmm = info.drivingTime ?? "--:--";
  const direction = getDirectionLabel(idx, info.routeId);
  const car = info.carNum ? `${info.carNum}車` : "";

  let status = "";
  const isSpecial = ["V11", "V01", "V26"].includes(nearest.train_id);
  const isSameTime = hhmm === nowHHMM;

  if ((info.drivingTime === "-" && info.carNum) ||
      (info.drivingTime === "-" && info.carNum === "" && sec === -1)) {
    status = "列車未有發車資訊";
  } else if (isSpecial && sec === 0) {
    status = isSameTime
      ? `即將發車｜發車時間:${hhmm}`
      : `等候發車｜發車時間:${hhmm}`;
  } else if (sec === 0) {
    status = `已到站｜發車時間:${hhmm}`;
  } else if (sec <= 60) {
    status = `即將進站｜發車時間:${hhmm}`;
  } else {
    status = `${formatTime(sec)}｜發車時間:${hhmm}`;
  }

  trainList.push({
    sec,
    direction,
    statusLine: car
      ? `${car}    ｜\n ${status}`
      : `列車未進站｜\n ${status}`
  });
});
trainList.sort((a, b) => a.sec - b.sec);

// ======================== Widget ========================
if (config.runsInWidget) {
  const w = new ListWidget();
  w.backgroundColor = Color.white();
  w.url = "scriptable:///run?scriptName=LRT_Timer29D16&silent=true";

  const title = w.addText("🚈 淡海輕軌列車動態");
  title.font = Font.boldSystemFont(24);
  title.textColor = Color.black();
  w.addSpacer(4);

  const timeText = w.addText(
    `🕒 更新時間：${new Date().toTimeString().slice(0, 8)}\n`
  );
  timeText.font = Font.systemFont(14);
  timeText.textColor = Color.gray();
  w.addSpacer(6);

  // ===== 最近車站（同一行）=====
   const stationRow = w.addStack();
   stationRow.layoutHorizontally();
   stationRow.centerAlignContent();

   // 左邊固定文字
   const stationLabel = stationRow.addText("📍 最近車站：");
   stationLabel.font = Font.boldSystemFont(18);
   stationLabel.textColor = Color.black();

   // 判斷車站代碼顏色
   let stationColor = Color.black();
   const tid = nearest.train_id;

   // V01 ~ V11 → 綠色
   if (/^V(0[1-9]|1[0-1])$/.test(tid)) {
     stationColor = new Color("#1AA34A");
   }
   // V26 ~ V28 → 藍色
   else if (/^V2[6-8]$/.test(tid)) {
     stationColor = new Color("#007AFF");
   }

   // 右邊：車站代碼 + 名稱（同一行）
   const stationName = stationRow.addText(
     ` ${nearest.train_id} ${nearest.station_name}站`
   );
   stationName.font = Font.boldSystemFont(18);
   stationName.textColor = stationColor;

   w.addSpacer(6);


  // ===== 距離=====
  const distanceText = w.addText(
    `📏 距離：約 ${distM} 公尺`
  );
  distanceText.font = Font.boldSystemFont(16);
  distanceText.textColor = new Color("#000000");
  w.addSpacer(4);

  if (isClosed) {
    const warn = w.addText("\n⚠️ 本日營運已結束 \n（每日首班約06:00，末班約00:31）");
    warn.font = Font.boldSystemFont(18);
    warn.textColor = new Color("#FF3B30");
  } else if (trainList.length) {
    trainList.slice(0, 2).forEach(t => {
      // 方向行（可上色）
      const dir = w.addText(`\n🚆 ${t.direction}`);
      dir.font = Font.boldSystemFont(16);
      if (t.direction.includes("紅樹林")){
        dir.textColor = new Color("#FF3B30");
        dir.font = Font.boldSystemFont(16);   
      }else if (t.direction.includes("崁頂")){
        dir.textColor = new Color("#1AA34A");
        dir.font = Font.boldSystemFont(16); 
      }else if (t.direction.includes("淡水漁人碼頭")){
        dir.textColor = new Color("#007AFF");
        dir.font = Font.boldSystemFont(16);
      }else{
        dir.textColor = Color.black();
        dir.font = Font.boldSystemFont(16);
      }
      // 狀態行
      const st = w.addText(t.statusLine);
      st.font = Font.systemFont(14);
      st.textColor = Color.black();

      w.addSpacer(4);
    });
  } else {
    const warn1 = w.addText("⚠️ 暫無列車");
    warn1.font = Font.boldSystemFont(16);
    warn1.textColor = new Color("#FF0000");
  }

  const cost = ((Date.now() - t0) / 1000).toFixed(2);
  const footer = w.addText(`\n⏱️ 查詢耗時 ${cost} 秒 \n  ${SCRIPT_NAME} ${VERSION}`);
  footer.font = Font.systemFont(14);
  footer.textColor = Color.black();

  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
  Script.setWidget(w);
  Script.complete();
  return;
}

// ======================== 非 Widget ========================
else {
  const n = new Notification();
  n.title = "🚈 淡海輕軌";
  n.body =
    `最近車站：${nearest.train_id} ${nearest.station_name}站\n` +
    `距離：約 ${distM} 公尺\n\n` +
    (trainList.length
      ? trainList.map(t => `🚆 ${t.direction}\n${t.statusLine}`).join("\n\n")
      : "⚠️ 暫無列車");
  n.schedule();
}

