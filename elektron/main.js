// Hesap Planım - Masaüstü (Electron) ana işlemi.
const { app, BrowserWindow, ipcMain, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL, URL } = require("url");

// Windows 10+ masaüstü bildirimleri için uygulama kimliği (ödeme hatırlatıcıları)
app.setAppUserModelId("com.hesapplanim.app");

// "app://" protokolü: statik çıktıyı kök dizinden servis eder. file:// yerine
// bunu kullanıyoruz çünkü file:// altında mutlak yollar (/_next/...) disk
// kökünde aranıyor ve sayfa "Yükleniyor..."de takılı kalıyordu.
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let pencere = null;
const AZAMI_DOSYA = 10;

function kokDizini() {
  return path.join(__dirname, "..", "out");
}

function appProtocolKur() {
  protocol.handle("app", (istek) => {
    let yol = decodeURIComponent(new URL(istek.url).pathname);
    if (!yol || yol === "/") yol = "/index.html";
    // dizin dışına çıkışı engelle (path traversal koruması)
    const tam = path.normalize(path.join(kokDizini(), yol));
    if (!tam.startsWith(path.normalize(kokDizini()))) {
      return new Response("Yasak", { status: 403 });
    }
    let hedef = tam;
    if (!fs.existsSync(hedef) || fs.statSync(hedef).isDirectory()) {
      const html = path.join(tam, "index.html");
      hedef = fs.existsSync(html) ? html : path.join(kokDizini(), "404.html");
    }
    return net.fetch(pathToFileURL(hedef).toString());
  });
}

function yedekKlasor() {
  const k = path.join(app.getPath("userData"), "yedekler");
  fs.mkdirSync(k, { recursive: true });
  return k;
}

ipcMain.handle("yedek-yaz", (_olay, ad, icerik) => {
  const temiz = path.basename(String(ad || "yedek.json"));
  fs.writeFileSync(path.join(yedekKlasor(), temiz), String(icerik || ""), "utf8");
  const dosyalar = fs.readdirSync(yedekKlasor()).filter((f) => f.endsWith(".json")).sort();
  while (dosyalar.length > AZAMI_DOSYA) {
    fs.unlinkSync(path.join(yedekKlasor(), dosyalar.shift()));
  }
  return true;
});

ipcMain.handle("yedek-listele", () => {
  return fs
    .readdirSync(yedekKlasor())
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .map((f) => {
      const st = fs.statSync(path.join(yedekKlasor(), f));
      return { ad: f, tarih: st.mtimeMs, boyut: st.size };
    });
});

ipcMain.handle("yedek-oku", (_olay, ad) => {
  return fs.readFileSync(path.join(yedekKlasor(), path.basename(String(ad))), "utf8");
});

// --- Dosya veritabanı (D2): veri her zaman diske yazılır ---
function veriDosyasi() {
  return path.join(app.getPath("userData"), "hesap-planim-veri.json");
}

ipcMain.handle("veri-yaz", (_olay, icerik) => {
  try {
    const hedef = veriDosyasi();
    const gecici = hedef + ".tmp";
    fs.writeFileSync(gecici, String(icerik || ""), "utf8");
    fs.renameSync(gecici, hedef); // atomik: yarı yazılmış dosya kalmaz
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("veri-oku", () => {
  try {
    const hedef = veriDosyasi();
    if (fs.existsSync(hedef)) return fs.readFileSync(hedef, "utf8");
  } catch {
    /* bozuk dosya → null */
  }
  return null;
});

function ac() {
  pencere = new BrowserWindow({
    width: 1360,
    height: 860,
    autoHideMenuBar: true,
    backgroundColor: "#f1f5f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });
  if (process.env.ELECTRON_DEV) {
    pencere.loadURL("http://localhost:3000");
  } else {
    pencere.loadURL("app://masaustu/index.html");
  }
}

app.whenReady().then(() => {
  if (!process.env.ELECTRON_DEV) appProtocolKur();
  ac();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (!pencere) ac();
});
