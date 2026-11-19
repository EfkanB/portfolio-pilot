using PortfolioPilot.Application.Common;
using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Interfaces;

public interface IPortfolioService
{
    Task<List<PortfolioDto>> GetPortfoliosByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PortfolioDto> CreatePortfolioAsync(Guid userId, CreatePortfolioDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeletePortfolioAsync(Guid userId, Guid portfolioId, CancellationToken cancellationToken = default);
    Task<PortfolioDto?> AddFundAsync(Guid userId, Guid portfolioId, AddInvestmentFundDto dto, CancellationToken cancellationToken = default);
    Task<PortfolioDto?> DeleteFundAsync(Guid userId, Guid portfolioId, Guid fundId, CancellationToken cancellationToken = default);
    Task<ServiceResult<PortfolioDto>> SellFundAsync(Guid userId, Guid portfolioId, SellFundDto dto, CancellationToken cancellationToken = default);

    /// <summary>Newest first. Returns null when the portfolio does not exist or is not owned by the user.</summary>
    Task<List<FundTransactionDto>?> GetTransactionsAsync(Guid userId, Guid portfolioId, CancellationToken cancellationToken = default);
}
