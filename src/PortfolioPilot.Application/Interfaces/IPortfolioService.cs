using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Interfaces;

public interface IPortfolioService
{
    Task<List<PortfolioDto>> GetPortfoliosByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PortfolioDto> CreatePortfolioAsync(Guid userId, CreatePortfolioDto dto, CancellationToken cancellationToken = default);
    Task<PortfolioDto?> AddFundAsync(Guid userId, Guid portfolioId, AddInvestmentFundDto dto, CancellationToken cancellationToken = default);
    Task<PortfolioDto?> DeleteFundAsync(Guid userId, Guid portfolioId, Guid fundId, CancellationToken cancellationToken = default);
    Task<PortfolioDto?> SellFundAsync(Guid userId, Guid portfolioId, SellFundDto dto, CancellationToken cancellationToken = default);
}
