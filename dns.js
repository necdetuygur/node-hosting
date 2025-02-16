import dgram from "dgram";
import fs from "fs";

const PORT = 53;
const DNS_RECORDS_FILE = "dns.json";

const server = dgram.createSocket("udp4");

// DNS kayıtlarını yükleyen fonksiyon
const loadDNSRecords = () => {
    try {
        return JSON.parse(fs.readFileSync(DNS_RECORDS_FILE, "utf8"));
    } catch (error) {
        console.error("DNS kayıtları yüklenirken hata oluştu:", error);
        return {};
    }
};

// Alan adını (domain) çıkaran fonksiyon
const extractDomain = (msg) => {
    let domain = "";
    let position = 12; // DNS header'ı atla
    while (msg[position] !== 0) {
        let length = msg[position];
        domain += msg.slice(position + 1, position + 1 + length).toString("utf8") + ".";
        position += length + 1;
    }
    return domain.slice(0, -1);
};

// DNS yanıtı oluşturan fonksiyon
const createDNSResponse = (msg, ipAddress) => {
    const response = Buffer.from([
        // Sorgunun ID'sini kopyala
        msg[0], msg[1],
        0x81, 0x80, // Standart yanıt, rekürsif çözümleme etkin
        0x00, 0x01, // 1 soru
        0x00, ipAddress ? 0x01 : 0x00, // 1 yanıt (varsa)
        0x00, 0x00, // Yetkili NS kaydı: 0
        0x00, 0x00, // Ekstra kayıt: 0
        // Sorgunun aynısını ekleyelim
        ...msg.slice(12),
        ...(ipAddress
            ? [
                  // Yanıt başlığı
                  0xc0, 0x0c, // İşaretçi
                  0x00, 0x01, 0x00, 0x01, // Tip A, Sınıf IN
                  0x00, 0x00, 0x00, 0x3c, // TTL: 60 saniye
                  0x00, 0x04, // IPv4 adresi uzunluğu: 4 bayt
                  ...ipAddress.split(".").map(Number), // IP'yi byte'a çevir
              ]
            : [])
    ]);

    return response;
};

// Gelen mesajları dinle
server.on("message", (msg, rinfo) => {
    const domain = extractDomain(msg);
    const dnsRecords = loadDNSRecords();
    const ipAddress = dnsRecords[domain];

    console.log(`Sorgu alındı: ${domain} -> ${ipAddress || "Kayıt bulunamadı"}`);

    const response = createDNSResponse(msg, ipAddress);
    server.send(response, rinfo.port, rinfo.address, (err) => {
        if (err) console.error("Yanıt gönderilirken hata oluştu:", err);
        else console.log(`Yanıt gönderildi: ${ipAddress || "Kayıt bulunamadı"} -> ${rinfo.address}:${rinfo.port}`);
    });
});

// Sunucuyu başlat
server.on("listening", () => {
    console.log(`DNS sunucusu ${PORT} portunda çalışıyor...`);
});

server.bind(PORT);
