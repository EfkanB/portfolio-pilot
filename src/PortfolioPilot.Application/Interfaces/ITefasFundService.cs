using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Interfaces;

public interface ITefasFundService
{
    Task<IReadOnlyList<TefasFundQuoteDto>> GetFundQuotesAsync(IEnumerable<string> fundCodes, CancellationToken cancellationToken = default);
    Task<TefasFundQuoteDto?> GetFundQuoteAsync(string fundCode, CancellationToken cancellationToken = default);
}