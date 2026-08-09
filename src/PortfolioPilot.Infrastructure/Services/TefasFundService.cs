using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;

namespace PortfolioPilot.Infrastructure.Services;

public class TefasFundService : ITefasFundService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TefasFundService> _logger;

    public TefasFundService(HttpClient httpClient, ILogger<TefasFundService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TefasFundQuoteDto>> GetFundQuotesAsync(IEnumerable<string> fundCodes, CancellationToken cancellationToken = default)
    {
        var normalizedCodes = (fundCodes ?? Array.Empty<string>())
            .Select(code => code?.Trim().ToUpperInvariant())
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedCodes.Count == 0)
        {
            return Array.Empty<TefasFundQuoteDto>();
        }

        await EnsureWarmupAsync(cancellationToken);

        var results = new List<TefasFundQuoteDto>();

        foreach (var code in normalizedCodes)
        {
            var quote = await GetFundQuoteAsync(code, cancellationToken);
            if (quote is not null)
            {
                results.Add(quote);
            }
        }

        return results;
    }

    public async Task<TefasFundQuoteDto?> GetFundQuoteAsync(string fundCode, CancellationToken cancellationToken = default)
    {
        var normalizedCode = fundCode?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            return null;
        }

        return await FetchFundQuoteAsync(normalizedCode, cancellationToken);
    }

    private async Task EnsureWarmupAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync("tr/", cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception exception)
        {
            _logger.LogDebug(exception, "TEFAS warmup request failed.");
        }
    }

    private async Task<TefasFundQuoteDto?> FetchFundQuoteAsync(string fundCode, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await SendJsonPostAsync(
                "api/funds/fonBilgiGetir",
                new
                {
                    fonKodu = fundCode,
                    dil = "TR",
                },
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("TEFAS returned {StatusCode} for fund {FundCode}", response.StatusCode, fundCode);
                return null;
            }

            var payloadText = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(payloadText))
            {
                _logger.LogDebug("TEFAS returned empty payload for fund {FundCode}", fundCode);
                return null;
            }

            using var document = JsonDocument.Parse(payloadText);
            var quoteElement = ExtractQuoteElement(document.RootElement);

            if (quoteElement.ValueKind != JsonValueKind.Object)
            {
                _logger.LogDebug("TEFAS response did not contain an object for fund {FundCode}", fundCode);
                return null;
            }

            return new TefasFundQuoteDto
            {
                FundCode = ReadString(quoteElement, fundCode, "fonKodu", "fonKod", "fonkodu") ?? fundCode,
                FundName = ReadString(quoteElement, fundCode, "fonUnvan", "unvan", "fonAdi") ?? fundCode,
                CurrentPrice = ReadDecimal(quoteElement, "sonFiyat", "fiyat", "currentPrice", "son_fiyat", "price"),
                DailyReturnPercent = ReadDecimal(quoteElement, "gunlukGetiri", "dailyReturn", "getiri", "gunluk_getiri", "dayReturn"),
                AsOfDate = ReadString(quoteElement, string.Empty, "tarih", "sonTarih", "date", "lastDate") ?? string.Empty,
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "TEFAS quote fetch failed for fund {FundCode}", fundCode);
        }

        var fallback = await TryGetFallbackFromHistoryAsync(fundCode, cancellationToken);
        if (fallback.Price is null && fallback.DailyReturn is null)
        {
            return null;
        }

        return new TefasFundQuoteDto
        {
            FundCode = fundCode,
            FundName = fundCode,
            CurrentPrice = fallback.Price,
            DailyReturnPercent = fallback.DailyReturn,
            AsOfDate = fallback.AsOfDate,
        };
    }

    private static JsonElement ExtractQuoteElement(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
        {
            return root[0];
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            if (TryGetPropertyIgnoreCase(root, "resultList", out var resultList) && resultList.ValueKind == JsonValueKind.Array && resultList.GetArrayLength() > 0)
            {
                return resultList[0];
            }

            if (TryGetPropertyIgnoreCase(root, "result", out var result) && result.ValueKind == JsonValueKind.Array && result.GetArrayLength() > 0)
            {
                return result[0];
            }

            if (TryGetPropertyIgnoreCase(root, "data", out var dataObject) && dataObject.ValueKind == JsonValueKind.Object)
            {
                return dataObject;
            }

            if (TryGetPropertyIgnoreCase(root, "data", out var data) && data.ValueKind == JsonValueKind.Array && data.GetArrayLength() > 0)
            {
                return data[0];
            }

            return root;
        }

        return default;
    }

    private async Task<(decimal? Price, decimal? DailyReturn, string AsOfDate)> TryGetFallbackFromHistoryAsync(string fundCode, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await SendJsonPostAsync(
                "api/funds/fonFiyatBilgiGetir",
                new
                {
                    fonKodu = fundCode,
                    dil = "TR",
                    periyod = 13,
                },
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return (null, null, string.Empty);
            }

            var payloadText = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(payloadText))
            {
                return (null, null, string.Empty);
            }

            using var document = JsonDocument.Parse(payloadText);
            var rows = ExtractRows(document.RootElement);
            if (rows.Count == 0)
            {
                return (null, null, string.Empty);
            }

            var lastRow = rows[^1];
            var previousRow = rows.Count > 1 ? rows[^2] : default;

            var price = ReadDecimal(lastRow, "fiyat", "sonFiyat", "currentPrice");
            decimal? dailyReturn = null;

            if (price is not null && previousRow.ValueKind == JsonValueKind.Object)
            {
                var previousPrice = ReadDecimal(previousRow, "fiyat", "sonFiyat", "currentPrice");
                if (previousPrice is not null && previousPrice.Value != 0)
                {
                    dailyReturn = Math.Round(((price.Value / previousPrice.Value) - 1m) * 100m, 4);
                }
            }

            return (
                price,
                dailyReturn,
                ReadString(lastRow, string.Empty, "tarih", "date", "sonTarih") ?? string.Empty);
        }
        catch
        {
            return (null, null, string.Empty);
        }
    }

    private static List<JsonElement> ExtractRows(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            return root.EnumerateArray().ToList();
        }

        if (root.ValueKind == JsonValueKind.Object)
        {
            if (TryGetPropertyIgnoreCase(root, "resultList", out var resultList) && resultList.ValueKind == JsonValueKind.Array)
            {
                return resultList.EnumerateArray().ToList();
            }

            if (TryGetPropertyIgnoreCase(root, "data", out var data) && data.ValueKind == JsonValueKind.Array)
            {
                return data.EnumerateArray().ToList();
            }
        }

        return [];
    }

    private async Task<HttpResponseMessage> SendJsonPostAsync(string requestUri, object body, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(body);
        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
        };

        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.TryAddWithoutValidation("X-Requested-With", "XMLHttpRequest");
        request.Headers.Referrer = new Uri("https://www.tefas.gov.tr/tr/");
        request.Headers.TryAddWithoutValidation("Origin", "https://www.tefas.gov.tr");

        return await _httpClient.SendAsync(request, cancellationToken);
    }

    private static string? ReadString(JsonElement element, string fallback, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (TryGetPropertyIgnoreCase(element, propertyName, out var property))
            {
                if (property.ValueKind == JsonValueKind.String)
                {
                    var value = property.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value.Trim();
                    }
                }
                else if (property.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                {
                    return property.ToString();
                }
            }
        }

        return string.IsNullOrWhiteSpace(fallback) ? null : fallback;
    }

    private static decimal? ReadDecimal(JsonElement element, params string[] propertyNames)
    {
        foreach (var propertyName in propertyNames)
        {
            if (!TryGetPropertyIgnoreCase(element, propertyName, out var property))
            {
                continue;
            }

            if (property.ValueKind == JsonValueKind.Number && property.TryGetDecimal(out var decimalValue))
            {
                return decimalValue;
            }

            if (property.ValueKind == JsonValueKind.String)
            {
                var raw = property.GetString();
                if (TryParseFlexibleDecimal(raw, out var parsedValue))
                {
                    return parsedValue;
                }
            }
        }

        return null;
    }

    private static bool TryGetPropertyIgnoreCase(JsonElement element, string propertyName, out JsonElement property)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var candidate in element.EnumerateObject())
            {
                if (string.Equals(candidate.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    property = candidate.Value;
                    return true;
                }
            }
        }

        property = default;
        return false;
    }

    private static bool TryParseFlexibleDecimal(string? raw, out decimal value)
    {
        value = default;

        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        var normalized = raw.Trim().Replace("%", string.Empty).Replace(".", string.Empty).Replace(",", ".");
        return decimal.TryParse(normalized, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out value);
    }
}