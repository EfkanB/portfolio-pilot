namespace PortfolioPilot.Application.Interfaces;

public interface IFinanceApiService
{
    Task<decimal?> GetFundPriceAsync(string fundCode, CancellationToken cancellationToken = default);
}