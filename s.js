/*****************************************************************
 * 🚈 淡海輕軌 Widget – 一鍵安裝器（正式分享版）
 * 適用：iOS 17+ / Scriptable 最新版
 *****************************************************************/

const SCRIPT_NAME = "LRT_Timer29D18";
const RAW_URL =
  "https://raw.githubusercontent.com/JiangMengXun/Scriptable/main/LRT_Timer29D18.js";

// ===== 使用本機儲存（❌ 不用 iCloud，避免錯誤）=====
const fm = FileManager.local();
const dir = fm.documentsDirectory();
const path = fm.joinPath(dir, `${SCRIPT_NAME}.js`);

// ===== 下載主程式 =====
let code;
try {
  const req = new Request(RAW_URL);
  code = await req.loadString();
} catch (e) {
  const a = new Alert();
  a.title = "❌ 下載失敗";
  a.message = "無法連線下載程式，請檢查網路。";
  a.addAction("OK");
  await a.present();
  Script.complete();
  return;
}

// ===== 寫入檔案 =====
fm.writeString(path, code);

// ===== 安裝完成提示（不跳轉、不開 URL）=====
const alert = new Alert();
alert.title = "✅ 安裝完成";
alert.message =
  `已成功安裝「${SCRIPT_NAME}.js」\n\n` +
    "下一步：\n" +
    "1️⃣ 打開 Scriptable App\n" +
    "2️⃣ Scripts → 點擊一次主程式\n" +
    "3️⃣ 加入 Widget 即可使用";
alert.addAction("知道了");
await alert.present();

Script.complete();
