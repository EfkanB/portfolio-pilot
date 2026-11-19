using System.Text.Json;
using PortfolioPilot.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace PortfolioPilot.Infrastructure.Services;

public class FinanceApiService : IFinanceApiService
{
    private readonly HttpClient _httpClient;
    private readonly ITefasFundService _tefasFundService;
    private readonly ILogger<FinanceApiService> _logger;

    public FinanceApiService(HttpClient httpClient, ITefasFundService tefasFundService, ILogger<FinanceApiService> logger)
    {
        _httpClient = httpClient;
        _tefasFundService = tefasFundService;
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

        // TEFAS fund codes (MAC, TTE, AFT...) collide with US tickers on Yahoo (TTE = TotalEnergies,
        // MAC = Macerich), so they are priced from TEFAS only. When TEFAS has no price we return null
        // and the caller keeps the last known price rather than storing another asset's price.
        if (IsTefasFundCode(code))
        {
            var quote = await _tefasFundService.GetFundQuoteAsync(code, cancellationToken);
            if (quote?.CurrentPrice is > 0m)
            {
                _logger.LogInformation("TEFAS returned price {Price} for {Code}", quote.CurrentPrice.Value, code);
                return quote.CurrentPrice.Value;
            }

            _logger.LogWarning("TEFAS returned no usable price for fund {Code}", code);
            return null;
        }

        // Stocks: Yahoo Finance with the raw symbol (e.g. AAPL), then the BIST .IS suffix (e.g. THYAO.IS).
        var price = await TryGetPriceFromYahooAsync(code, cancellationToken);
        if (price.HasValue)
        {
            _logger.LogInformation("Yahoo (raw) returned price {Price} for {Code}", price.Value, code);
            return price;
        }

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

        _logger.LogWarning("All price sources exhausted for code {Code}", code);
        return null;
    }

    /// <summary>TEFAS fund codes are exactly three letters/digits (e.g. AFT, TI2).</summary>
    private static bool IsTefasFundCode(string code) =>
        code.Length == 3 && code.All(char.IsAsciiLetterOrDigit);

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
}
