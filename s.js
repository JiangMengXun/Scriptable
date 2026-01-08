// =====================================================
// 📥 LRT 淡海輕軌 Widget 安裝器（正式分享版）
// Author: JMX
// =====================================================

const SCRIPT_NAME = "LRT_Timer29D19";
const RAW_URL =
  "https://raw.githubusercontent.com/JiangMengXun/Scriptable/main/LRT_Timer29D19.js";

// 下載主程式
const code = await new Request(RAW_URL).loadString();

// 寫入 Scriptable（iCloud）
const fm = FileManager.iCloud();
const path = fm.joinPath(fm.documentsDirectory(), `${SCRIPT_NAME}.js`);
fm.writeString(path, code);

// 👉 只在「非背景」顯示提示
if (!args.queryParameters?.silent) {
  const alert = new Alert();
  alert.title = "安裝完成 ✅";
  alert.message =
    `已成功安裝「${SCRIPT_NAME}.js」\n\n` +
    "下一步：\n" +
    "1️⃣ 打開 Scriptable App\n" +
    "2️⃣ Scripts → 點擊一次主程式\n" +
    "3️⃣ 加入 Widget 即可使用";
  alert.addAction("OK");
  await alert.present();
}

Script.complete();
