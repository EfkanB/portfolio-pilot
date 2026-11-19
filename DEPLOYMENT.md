# Canlıya Alma Kontrol Listesi

Projeyi bir sunucuya yüklemeden önce bu listeyi baştan sona uygula. Geliştirme ortamında her şey `localhost` ve bilgisayardaki gizli ayarlarla çalışıyor; canlıda bunların hiçbiri otomatik gelmez.

> Ayarları sunucuda **ortam değişkeni** olarak ver. .NET'te `:` yerine çift alt çizgi kullanılır: `Jwt:Key` ayarı ortam değişkeninde `Jwt__Key` olur. Gizli değerleri hiçbir zaman `appsettings.json` dosyasına yazıp commit'leme.

## 1. JWT anahtarı (en önemlisi)

- [ ] **Yeni bir anahtar üret.** En az 32 karakter, rastgele olsun. Örneğin:
  ```bash
  openssl rand -base64 48
  ```
- [ ] Sunucuda `Jwt__Key=<üretilen-değer>` olarak ayarla.
- [ ] **Eski commit'lerde `appsettings.json` içinde duran anahtarı asla kullanma.** Eski commit'lerde herkese açık duruyor; bu anahtarı bilen biri herhangi bir kullanıcı adına giriş token'ı üretebilir.
- [ ] Geliştirme bilgisayarındaki user-secrets anahtarını da canlıda kullanma; canlının anahtarı ayrı olsun.

Anahtar eksik ya da 32 karakterden kısaysa API bilerek açılmaz ve hata mesajında ne yapılacağını yazar (`src/PortfolioPilot.WebAPI/Program.cs`).

## 2. Veritabanı

- [ ] `ConnectionStrings__DefaultConnection` değerini canlı SQL Server'a göre ayarla. `appsettings.json` içindeki `(localdb)\MSSQLLocalDB` sadece geliştirme bilgisayarında çalışır.
- [ ] Bağlantı dizesinde şifre varsa onu da sadece ortam değişkenine koy.
- [ ] Şemayı oluştur / güncelle:
  ```bash
  dotnet ef database update -p src/PortfolioPilot.Infrastructure -s src/PortfolioPilot.WebAPI
  ```
  `AddFundTransactionsAndPricePrecision` migration'ı fiyat sütunlarını 2 ondalıktan 6 ondalığa genişletir ve işlem geçmişi tablosunu ekler. Veri kaybı yoktur, ama yine de önce yedek al.

## 3. Frontend ile backend'in birbirini bulması

- [ ] Frontend'i derlerken API adresini ver (yoksa `http://localhost:5000` kullanılır):
  ```bash
  cd frontend
  VITE_API_URL=https://api.senin-alan-adin.com npm run build
  ```
  Bu değer derleme anında koda gömülür; adres değişirse yeniden derlemek gerekir.
- [ ] Backend'de frontend adresine izin ver (CORS). Yoksa tarayıcı istekleri engeller:
  ```
  Cors__AllowedOrigins__0=https://senin-alan-adin.com
  ```
- [ ] `frontend/dist` klasörünü yayınlarken sunucuyu, bilinmeyen tüm adresleri `index.html`'e yönlendirecek şekilde ayarla (SPA fallback). Yoksa `/dashboard` sayfası yenilenince 404 verir.

## 4. HTTPS ve ortam

- [ ] Canlıda `ASPNETCORE_ENVIRONMENT=Production` olsun. Bu sayede:
  - Swagger arayüzü kapanır,
  - geliştirme amaçlı `POST /api/Portfolio/simulate-price` 404 döner.
- [ ] HTTPS sertifikası ayarla. Giriş token'ları ve şifreler düz HTTP üzerinden gönderilmemeli. Kod zaten `UseHttpsRedirection` içeriyor; sunucuda bir HTTPS adresi tanımlı olmalı.
- [ ] `launchSettings.json` sadece yerelde çalışırken kullanılır; canlıyı etkilemez.

## 5. Redis

- [ ] Şu an `RedisCacheService` kayıtlı ama **hiçbir yerde kullanılmıyor**. Redis kurmadan da uygulama çalışır.
- [ ] İleride önbellek kullanılmaya başlanırsa `Redis__Configuration=<host>:6379` (ve gerekiyorsa şifre) ayarla.

## 6. Bağımlılıklar

- [ ] `AutoMapper 12.0.1` için bilinen yüksek önemde bir güvenlik açığı var (GHSA-rvv3-g6hj-g44x). Canlıya almadan önce düzeltilmiş bir sürüme geç ya da AutoMapper'ı kaldırmayı değerlendir. Yeni sürümlerin lisansı ticari olabilir; yükseltmeden önce lisans koşullarını kontrol et.
- [ ] `dotnet list package --vulnerable` ve `npm audit` çalıştırıp sonuçlara bak.

## 7. Son kontrol

- [ ] `dotnet test PortfolioPilot.sln` geçiyor.
- [ ] `cd frontend && npm run lint && npm run build` hatasız.
- [ ] Canlıda kayıt ol → giriş yap → portföy oluştur → fon al → sat → işlem geçmişini gör akışını bir kez elle dene.
- [ ] Tarayıcının geliştirici araçlarında (Network) isteklerin `https://` ile gittiğini ve CORS hatası olmadığını kontrol et.
