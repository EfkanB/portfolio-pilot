using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Domain.Entities;

namespace PortfolioPilot.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Portfolio> Portfolios { get; }
    DbSet<InvestmentFund> InvestmentFunds { get; }
    DbSet<FundTransaction> FundTransactions { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}