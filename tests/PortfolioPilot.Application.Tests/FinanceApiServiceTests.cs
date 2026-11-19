using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.Infrastructure.Services;

namespace PortfolioPilot.Application.Tests;

public class FinanceApiServiceTests
{
    // What Yahoo answers for "TTE": TotalEnergies' share price, not the TEFAS fund.
    private const string YahooChartJson = """{"chart":{"result":[{"meta":{"regularMarketPrice":87.14}}]}}""";

    private readonly RecordingHandler _yahoo = new(YahooChartJson);
    private readonly FakeTefasService _tefas = new();

    private FinanceApiService CreateService() =>
        new(new HttpClient(_yahoo) { BaseAddress = new Uri("https://query1.finance.yahoo.com/") },
            _tefas,
            NullLogger<FinanceApiService>.Instance);

    [Fact]
    public async Task TefasCode_UsesTefasPrice_AndNeverAsksYahoo()
    {
        _tefas.Prices["TTE"] = 0.991877m;

        var price = await CreateService().GetFundPriceAsync("tte");

        Assert.Equal(0.991877m, price);
        Assert.Empty(_yahoo.Requests);
    }

    [Fact]
    public async Task TefasCode_WhenTefasHasNoPrice_ReturnsNull_InsteadOfAUsTickerPrice()
    {
        var price = await CreateService().GetFundPriceAsync("TTE");

        Assert.Null(price);
        Assert.Empty(_yahoo.Requests);
    }

    [Fact]
    public async Task TefasCode_WithZeroPrice_IsTreatedAsMissing()
    {
        _tefas.Prices["PBR"] = 0m;

        var price = await CreateService().GetFundPriceAsync("PBR");

        Assert.Null(price);
    }

    [Fact]
    public async Task NonFundSymbol_StillUsesYahoo()
    {
        var price = await CreateService().GetFundPriceAsync("AAPL");

        Assert.Equal(87.14m, price);
        Assert.Single(_yahoo.Requests);
        Assert.Empty(_tefas.Requested);
    }

    private sealed class FakeTefasService : ITefasFundService
    {
        public Dictionary<string, decimal> Prices { get; } = new(StringComparer.OrdinalIgnoreCase);
        public List<string> Requested { get; } = [];

        public Task<TefasFundQuoteDto?> GetFundQuoteAsync(string fundCode, CancellationToken cancellationToken = default)
        {
            Requested.Add(fundCode);
            return Task.FromResult(Prices.TryGetValue(fundCode, out var price)
                ? new TefasFundQuoteDto { FundCode = fundCode, FundName = fundCode, CurrentPrice = price }
                : null);
        }

        public Task<IReadOnlyList<TefasFundQuoteDto>> GetFundQuotesAsync(IEnumerable<string> fundCodes, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }

    private sealed class RecordingHandler(string body) : HttpMessageHandler
    {
        public List<Uri> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request.RequestUri!);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            });
        }
    }
}
