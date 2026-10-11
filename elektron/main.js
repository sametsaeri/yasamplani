// Hesap Planım - Masaüstü (Electron) ana işlemi.
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Windows 10+ masaüstü bildirimleri için uygulama kimliği (ödeme hatırlatıcıları)
app.setAppUserModelId("com.hesapplanim.app");

// DİKKAT: Sayfa file:// ile açılır. Değiştirme!
// Chromium localStorage'i origin'e göre ayırır; app:// gibi özel bir
// şemaya geçmek kullanıcı listesini (hp-users) ve verileri yeni bir depoya
// taşır, kullanıcı "e-posta kayıtlı değil" hatasıyla karşılaşır.
// Mutlak yol sorunu next.config.mjs içindeki `assetPrefix: "./"` ile çözülür.

let pencere = null;
const AZAMI_DOSYA = 10;

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

// --- Hesap kayıtları (D3) ---
// Kullanıcı listesi (e-posta + şifre özeti + güvenlik sorusu) yalnızca
// localStorage'da tutuluyordu. localStorage origin'e bağlı olduğu için şema
// (file:// -> app://) değişince hesap kaydı "kayıtlı değil" diyerek kayboluyordu.
// Artık kalıcı dosyada da tutulur; iki depo birlikte okunur.
function kullanicilarDosyasi() {
  return path.join(app.getPath("userData"), "hesap-planim-kullanicilar.json");
}

ipcMain.handle("kullanicilar-oku", () => {
  try {
    const hedef = kullanicilarDosyasi();
    if (fs.existsSync(hedef)) return fs.readFileSync(hedef, "utf8");
  } catch {
    /* bozuk dosya → null */
  }
  return null;
});

ipcMain.handle("kullanicilar-yaz", (_olay, icerik) => {
  try {
    const hedef = kullanicilarDosyasi();
    const gecici = hedef + ".tmp";
    fs.writeFileSync(gecici, String(icerik || "[]"), "utf8");
    fs.renameSync(gecici, hedef); // atomik
    return true;
  } catch {
    return false;
  }
});

// --- PDF dökümü ---
// Chromium'un kendi PDF motoru kullanılır: Türkçe karakterler (ğüşıöçĞÜŞİÖÇ)
// sorunsuz gömülür. Gizli pencerede döküm açılır, PDF üretilip kaydedilir.
ipcMain.handle("pdf-kaydet", async (_olay, html, varsayilanAd) => {
  if (!pencere) return { ok: false, hata: "Pencere yok" };
  const { dialog } = require("electron");
  try {
    const sonuc = await dialog.showSaveDialog(pencere, {
      title: "PDF kaydet",
      defaultPath: path.join(app.getPath("documents"), String(varsayilanAd || "dokum.pdf")),
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (sonuc.canceled || !sonuc.filePath) return { ok: false, iptal: true };
    const veri = await pencere.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { marginType: "custom", top: 0.55, bottom: 0.55, left: 0.47, right: 0.47 },
      preferCSSPageSize: true
    });
    fs.writeFileSync(sonuc.filePath, veri);
    return { ok: true, yol: sonuc.filePath };
  } catch (e) {
    return { ok: false, hata: String(e && e.message ? e.message : e) };
  }
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
    // file:// — orijinal origin, localStorage ve kullanıcı listesi korunur
    pencere.loadFile(path.join(__dirname, "..", "out", "index.html"));
  }
}

app.whenReady().then(ac);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (!pencere) ac();
});
