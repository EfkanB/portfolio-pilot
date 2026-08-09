using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using HtmlAgilityPack;
using PortfolioPilot.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace PortfolioPilot.Infrastructure.Services;

public class FinanceApiService : IFinanceApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FinanceApiService> _logger;

    // Browser-mimicking static client for TEFAS API (Turkish mutual funds)
    private static readonly HttpClient TefasHttpClient = new()
    {
        BaseAddress = new Uri("https://www.tefas.gov.tr/"),
        Timeout = TimeSpan.FromSeconds(15),
    };

    static FinanceApiService()
    {
        TefasHttpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        TefasHttpClient.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/javascript, */*; q=0.01");
        TefasHttpClient.DefaultRequestHeaders.AcceptEncoding.ParseAdd("gzip, deflate, br");
        TefasHttpClient.DefaultRequestHeaders.AcceptLanguage.ParseAdd("tr-TR,tr;q=0.9,en;q=0.8");
        TefasHttpClient.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");
        TefasHttpClient.DefaultRequestHeaders.Referrer = new Uri("https://www.tefas.gov.tr/FonBilgi/Main.aspx?fislemTipi=3");
        TefasHttpClient.DefaultRequestHeaders.Add("Origin", "https://www.tefas.gov.tr");
    }

    public FinanceApiService(HttpClient httpClient, ILogger<FinanceApiService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        if (_httpClient.BaseAddress is null)
        {
            _httpClient.BaseAddress = new Uri("https://query1.finance.yahoo.com/");
        }

        // Ensure Yahoo client has a reasonable browser-like User-Agent
        if (!_httpClient.DefaultRequestHeaders.UserAgent.Any())
        {
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
        }
    }

    public async Task<decimal?> GetFundPriceAsync(string fundCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fundCode))
        {
            return null;
        }

        var code = fundCode.Trim().ToUpperInvariant();

        // ── Step 1: Try Yahoo Finance with raw code (e.g. THYAO, AAPL) ──
        var price = await TryGetPriceFromYahooAsync(code, cancellationToken);
        if (price.HasValue)
        {
            _logger.LogInformation("Yahoo (raw) returned price {Price} for {Code}", price.Value, code);
            return price;
        }

        // ── Step 2: Try Yahoo Finance with .IS suffix for BIST stocks (e.g. THYAO.IS) ──
        if (!code.EndsWith(".IS", StringComparison.OrdinalIgnoreCase))
        {
            var bistSymbol = code + ".IS";
            price = await TryGetPriceFromYahooAsync(bistSymbol, cancellationToken);
            if (price.HasValue)
            {
                _logger.LogInformation("Yahoo (BIST .IS) returned price {Price} for {Code}", price.Value, bistSymbol);
                return price;
            }
        }

        // ── Step 3: Try TEFAS API for Turkish mutual funds (e.g. MAC, YAS, AFT) ──
        price = await TryGetPriceFromTefasAsync(code, cancellationToken);
        if (price.HasValue)
        {
            _logger.LogInformation("TEFAS returned price {Price} for {Code}", price.Value, code);
            return price;
        }

        // ── Step 4: Try Yahoo Finance HTML as an open-web fallback ──
        price = await TryGetPriceFromYahooHtmlAsync(code, cancellationToken);
        if (price.HasValue)
        {
            _logger.LogInformation("Yahoo HTML returned price {Price} for {Code}", price.Value, code);
            return price;
        }

        if (!code.EndsWith(".IS", StringComparison.OrdinalIgnoreCase))
        {
            var bistSymbol = code + ".IS";
            price = await TryGetPriceFromYahooHtmlAsync(bistSymbol, cancellationToken);
            if (price.HasValue)
            {
                _logger.LogInformation("Yahoo HTML (.IS) returned price {Price} for {Code}", price.Value, bistSymbol);
                return price;
            }
        }

        // ── Step 5: Try İş Yatırım API as a secondary fallback ──
        price = await TryGetPriceFromIsYatirimAsync(code, cancellationToken);
        if (price.HasValue)
        {
            _logger.LogInformation("İş Yatırım returned price {Price} for {Code}", price.Value, code);
            return price;
        }

        _logger.LogWarning("All price sources exhausted for code {Code}", code);
        return null;
    }

    /// <summary>
    /// Attempts to fetch a price from Yahoo Finance for a given symbol.
    /// </summary>
    private async Task<decimal?> TryGetPriceFromYahooAsync(string symbol, CancellationToken cancellationToken)
    {
        var requestUri = $"v8/finance/chart/{Uri.EscapeDataString(symbol)}?interval=1d&range=1d&includePrePost=false&events=div,splits";

        try
        {
            using var response = await _httpClient.GetAsync(requestUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Yahoo API returned {StatusCode} for symbol {Symbol}", response.StatusCode, symbol);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            if (TryReadYahooPrice(document.RootElement, out var price))
            {
                return price;
            }

            _logger.LogDebug("Yahoo response did not contain a usable price for symbol {Symbol}", symbol);
            return null;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogDebug(exception, "Yahoo fetch failed for symbol {Symbol}", symbol);
            return null;
        }
    }

    /// <summary>
    /// Fetches fund price from TEFAS (Türkiye Elektronik Fon Dağıtım Platformu).
    /// Uses the official TEFAS API with browser-mimicking headers to bypass WAF.
    /// POSTs to /api/DB/BindHistoryInfo with form data and parses the latest price.
    /// </summary>
    private async Task<decimal?> TryGetPriceFromTefasAsync(string fundCode, CancellationToken cancellationToken)
    {
        try
        {
            // TEFAS API expects form-urlencoded data
            var formData = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["sBasTar"] = DateTime.UtcNow.AddMonths(-1).ToString("dd-MM-yyyy"),
                ["sBitTar"] = DateTime.UtcNow.ToString("dd-MM-yyyy"),
                ["sfontip"] = "0",
                ["fontip"] = "0",
                ["fonKodu"] = fundCode,
            });

            using var response = await TefasHttpClient.PostAsync("api/DB/BindHistoryInfo", formData, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("TEFAS API returned {StatusCode} for fund {Code}", response.StatusCode, fundCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            // TEFAS returns an array of history records. Parse with System.Text.Json.
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                _logger.LogDebug("TEFAS response is not an array for fund {Code}", fundCode);
                return null;
            }

            // Iterate from end to find the first record with a valid "fiyat" (price)
            var arrayLength = document.RootElement.GetArrayLength();
            for (var i = arrayLength - 1; i >= 0; i--)
            {
                var record = document.RootElement[i];
                if (record.TryGetProperty("fiyat", out var fiyatElement) && fiyatElement.ValueKind == JsonValueKind.String)
                {
                    var rawPrice = fiyatElement.GetString();
                    if (!string.IsNullOrEmpty(rawPrice) && TryParseTurkishDecimal(rawPrice, out var price))
                    {
                        return price;
                    }
                }
            }

            _logger.LogDebug("TEFAS response parsed but no price found for fund {Code}", fundCode);
            return null;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogDebug(exception, "TEFAS fetch failed for fund {Code}", fundCode);
            return null;
        }
    }

    /// <summary>
    /// Attempts to fetch fund price from İş Yatırım's public API as a secondary fallback.
    /// </summary>
    private async Task<decimal?> TryGetPriceFromIsYatirimAsync(string fundCode, CancellationToken cancellationToken)
    {
        try
        {
            // Using İş Yatırım's public fund price endpoint
            var url = $"https://im.isyatirim.com.tr/ISYATIRIM_MB_API/fiyat?kod={Uri.EscapeDataString(fundCode)}&tip=FON";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
            request.Headers.Accept.ParseAdd("application/json, text/plain, */*");
            request.Headers.AcceptLanguage.ParseAdd("tr-TR,tr;q=0.9,en;q=0.8");
            request.Headers.Add("X-Requested-With", "XMLHttpRequest");
            request.Headers.Referrer = new Uri("https://www.isyatirim.com.tr/tr-tr/analiz/fon/Sayfalar/default.aspx");

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            using var response = await httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("İş Yatırım returned {StatusCode} for fund {Code}", response.StatusCode, fundCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var document = JsonDocument.Parse(json);

            // Try to extract price from response - structure varies, try common patterns
            if (document.RootElement.TryGetProperty("fiyat", out var fiyatEl) && fiyatEl.ValueKind == JsonValueKind.Number)
            {
                if (fiyatEl.TryGetDecimal(out var price)) return price;
            }

            if (document.RootElement.TryGetProperty("price", out var priceEl) && priceEl.ValueKind == JsonValueKind.Number)
            {
                if (priceEl.TryGetDecimal(out var price)) return price;
            }

            if (document.RootElement.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Object)
            {
                if (dataEl.TryGetProperty("fiyat", out var fiyatData) && fiyatData.ValueKind == JsonValueKind.Number)
                {
                    if (fiyatData.TryGetDecimal(out var price)) return price;
                }
            }

            _logger.LogDebug("İş Yatırım response parsed but no price found for fund {Code}", fundCode);
            return null;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogDebug(exception, "İş Yatırım fetch failed for fund {Code}", fundCode);
            return null;
        }
    }

    /// <summary>
    /// Scrapes Yahoo Finance HTML for an embedded market price when the JSON endpoint fails.
    /// </summary>
    private async Task<decimal?> TryGetPriceFromYahooHtmlAsync(string symbol, CancellationToken cancellationToken)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"https://finance.yahoo.com/quote/{Uri.EscapeDataString(symbol)}");
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
            request.Headers.Accept.ParseAdd("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            request.Headers.AcceptLanguage.ParseAdd("tr-TR,tr;q=0.9,en;q=0.8");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Yahoo HTML returned {StatusCode} for symbol {Symbol}", response.StatusCode, symbol);
                return null;
            }

            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(html))
            {
                return null;
            }

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            foreach (var scriptNode in doc.DocumentNode.SelectNodes("//script") ?? Enumerable.Empty<HtmlNode>())
            {
                var scriptText = scriptNode.InnerText;
                if (TryExtractYahooPriceFromScript(scriptText, out var price))
                {
                    return price;
                }
            }

            _logger.LogDebug("Yahoo HTML parsed but no price found for symbol {Symbol}", symbol);
            return null;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogDebug(exception, "Yahoo HTML fetch failed for symbol {Symbol}", symbol);
            return null;
        }
    }

    /// <summary>
    /// Parses a Turkish-formatted decimal string (e.g. "1.234,567891" or "0,123456") to a decimal.
    /// Removes thousand separators (.) and replaces decimal comma (,) with dot (.).
    /// </summary>
    private static bool TryParseTurkishDecimal(string raw, out decimal value)
    {
        value = default;

        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        var cleaned = raw.Trim().Replace(".", "").Replace(",", ".");
        return decimal.TryParse(cleaned, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out value);
    }

    private static bool TryReadYahooPrice(JsonElement root, out decimal price)
    {
        price = default;

        if (!root.TryGetProperty("chart", out var chartElement) ||
            !chartElement.TryGetProperty("result", out var resultElement) ||
            resultElement.ValueKind != JsonValueKind.Array ||
            resultElement.GetArrayLength() == 0)
        {
            return false;
        }

        var result = resultElement[0];

        if (result.TryGetProperty("meta", out var metaElement) &&
            metaElement.TryGetProperty("regularMarketPrice", out var priceElement) &&
            priceElement.TryGetDecimal(out price))
        {
            return true;
        }

        if (result.TryGetProperty("indicators", out var indicatorsElement) &&
            indicatorsElement.TryGetProperty("quote", out var quoteElement) &&
            quoteElement.ValueKind == JsonValueKind.Array &&
            quoteElement.GetArrayLength() > 0)
        {
            var quote = quoteElement[0];
            if (quote.TryGetProperty("close", out var closeElement) && closeElement.ValueKind == JsonValueKind.Array)
            {
                for (var index = closeElement.GetArrayLength() - 1; index >= 0; index--)
                {
                    var closeValue = closeElement[index];
                    if (closeValue.ValueKind == JsonValueKind.Number && closeValue.TryGetDecimal(out price))
                    {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private static bool TryExtractYahooPriceFromScript(string scriptText, out decimal price)
    {
        price = default;

        if (string.IsNullOrWhiteSpace(scriptText))
        {
            return false;
        }

        var patterns = new[]
        {
            "\"regularMarketPrice\"\\s*:\\s*\\{\\s*\"raw\"\\s*:\\s*(?<price>-?\\d+(?:\\.\\d+)?)",
            "\"currentPrice\"\\s*:\\s*\\{\\s*\"raw\"\\s*:\\s*(?<price>-?\\d+(?:\\.\\d+)?)",
            "\"price\"\\s*:\\s*\\{\\s*\"raw\"\\s*:\\s*(?<price>-?\\d+(?:\\.\\d+)?)",
        };

        foreach (var pattern in patterns)
        {
            var match = System.Text.RegularExpressions.Regex.Match(scriptText, pattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);
            if (!match.Success)
            {
                continue;
            }

            var raw = match.Groups["price"].Value;
            if (decimal.TryParse(raw, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out price))
            {
                return true;
            }
        }

        return false;
    }
}

