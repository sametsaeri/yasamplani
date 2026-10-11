// Güvenli köprü: sayfaya yalnızca yedek fonksiyonlarını açar.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("elektron", {
  yedekYaz: (ad, icerik) => ipcRenderer.invoke("yedek-yaz", ad, icerik),
  yedekListe: () => ipcRenderer.invoke("yedek-listele"),
  yedekOku: (ad) => ipcRenderer.invoke("yedek-oku", ad),
  veriYaz: (icerik) => ipcRenderer.invoke("veri-yaz", icerik),
  veriOku: () => ipcRenderer.invoke("veri-oku"),
  kullanicilarYaz: (icerik) => ipcRenderer.invoke("kullanicilar-yaz", icerik),
  kullanicilarOku: () => ipcRenderer.invoke("kullanicilar-oku")
});
