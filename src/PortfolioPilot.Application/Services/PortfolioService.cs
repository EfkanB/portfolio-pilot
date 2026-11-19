using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.Common;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.Domain.Entities;

namespace PortfolioPilot.Application.Services;

public class PortfolioService : IPortfolioService
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly TimeProvider _timeProvider;

    public PortfolioService(IApplicationDbContext context, IMapper mapper, TimeProvider? timeProvider = null)
    {
        _context = context;
        _mapper = mapper;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    private DateTime UtcNow => _timeProvider.GetUtcNow().UtcDateTime;

    public async Task<List<PortfolioDto>> GetPortfoliosByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var portfolios = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<PortfolioDto>>(portfolios);
    }

    public async Task<PortfolioDto> CreatePortfolioAsync(Guid userId, CreatePortfolioDto dto, CancellationToken cancellationToken = default)
    {
        var portfolio = _mapper.Map<Portfolio>(dto);
        portfolio.Id = Guid.NewGuid();
        portfolio.UserId = userId;
        portfolio.Name = dto.Name.Trim();
        portfolio.CreatedAt = UtcNow;

        _context.Portfolios.Add(portfolio);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<PortfolioDto>(portfolio);
    }

    public async Task<bool> DeletePortfolioAsync(Guid userId, Guid portfolioId, CancellationToken cancellationToken = default)
    {
        var portfolio = await FindOwnedPortfolioAsync(userId, portfolioId, cancellationToken);
        if (portfolio is null)
        {
            return false;
        }

        // Funds and transactions are removed by the cascade configured in ApplicationDbContext.
        _context.InvestmentFunds.RemoveRange(portfolio.InvestmentFunds);
        _context.Portfolios.Remove(portfolio);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<PortfolioDto?> AddFundAsync(Guid userId, Guid portfolioId, AddInvestmentFundDto dto, CancellationToken cancellationToken = default)
    {
        var portfolio = await FindOwnedPortfolioAsync(userId, portfolioId, cancellationToken);
        if (portfolio is null)
        {
            return null;
        }

        var fundCode = NormalizeCode(dto.FundCode);
        var price = dto.CurrentPrice;

        var fund = portfolio.InvestmentFunds.FirstOrDefault(f => string.Equals(f.FundCode, fundCode, StringComparison.OrdinalIgnoreCase));
        if (fund is null)
        {
            fund = new InvestmentFund
            {
                Id = Guid.NewGuid(),
                PortfolioId = portfolioId,
                FundCode = fundCode,
                // Frontend may omit fundName; fall back to the code.
                FundName = string.IsNullOrWhiteSpace(dto.FundName) ? fundCode : dto.FundName.Trim(),
                Quantity = dto.Quantity,
                AverageCost = price,
                CurrentPrice = price,
            };

            _context.InvestmentFunds.Add(fund);
        }
        else
        {
            var totalQuantity = fund.Quantity + dto.Quantity;

            fund.AverageCost = ((fund.Quantity * fund.AverageCost) + (dto.Quantity * price)) / totalQuantity;
            fund.Quantity = totalQuantity;
            fund.CurrentPrice = price;
            if (!string.IsNullOrWhiteSpace(dto.FundName))
            {
                fund.FundName = dto.FundName.Trim();
            }
        }

        _context.FundTransactions.Add(new FundTransaction
        {
            Id = Guid.NewGuid(),
            PortfolioId = portfolioId,
            FundCode = fund.FundCode,
            FundName = fund.FundName,
            Type = TransactionType.Buy,
            Quantity = dto.Quantity,
            Price = price,
            AverageCostAtTrade = fund.AverageCost,
            CreatedAt = UtcNow,
        });

        await _context.SaveChangesAsync(cancellationToken);

        return await GetPortfolioDtoAsync(portfolioId, cancellationToken);
    }

    public async Task<PortfolioDto?> DeleteFundAsync(Guid userId, Guid portfolioId, Guid fundId, CancellationToken cancellationToken = default)
    {
        var portfolio = await FindOwnedPortfolioAsync(userId, portfolioId, cancellationToken);
        var fund = portfolio?.InvestmentFunds.FirstOrDefault(f => f.Id == fundId);
        if (fund is null)
        {
            return null;
        }

        // Deleting a position corrects a data-entry mistake; it is not a sale, so no ledger entry.
        _context.InvestmentFunds.Remove(fund);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetPortfolioDtoAsync(portfolioId, cancellationToken);
    }

    public async Task<ServiceResult<PortfolioDto>> SellFundAsync(Guid userId, Guid portfolioId, SellFundDto dto, CancellationToken cancellationToken = default)
    {
        var portfolio = await FindOwnedPortfolioAsync(userId, portfolioId, cancellationToken);
        if (portfolio is null)
        {
            return ServiceResult<PortfolioDto>.NotFound("Portföy bulunamadı.");
        }

        var fundCode = NormalizeCode(dto.FundCode);
        var fund = portfolio.InvestmentFunds.FirstOrDefault(f => string.Equals(f.FundCode, fundCode, StringComparison.OrdinalIgnoreCase));
        if (fund is null)
        {
            return ServiceResult<PortfolioDto>.NotFound($"{fundCode} bu portföyde bulunmuyor.");
        }

        if (dto.Quantity > fund.Quantity)
        {
            return ServiceResult<PortfolioDto>.Invalid(
                $"Satılmak istenen adet ({dto.Quantity:0.####}) mevcut adetten ({fund.Quantity:0.####}) fazla.");
        }

        var price = dto.Price ?? fund.CurrentPrice;
        if (price <= 0)
        {
            return ServiceResult<PortfolioDto>.Invalid("Satış fiyatı belirlenemedi; lütfen fiyat girin.");
        }

        _context.FundTransactions.Add(new FundTransaction
        {
            Id = Guid.NewGuid(),
            PortfolioId = portfolioId,
            FundCode = fund.FundCode,
            FundName = fund.FundName,
            Type = TransactionType.Sell,
            Quantity = dto.Quantity,
            Price = price,
            AverageCostAtTrade = fund.AverageCost,
            RealizedProfitLoss = (price - fund.AverageCost) * dto.Quantity,
            CreatedAt = UtcNow,
        });

        if (dto.Quantity == fund.Quantity)
        {
            _context.InvestmentFunds.Remove(fund);
        }
        else
        {
            // Selling never changes the average cost of the remaining units.
            fund.Quantity -= dto.Quantity;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return ServiceResult<PortfolioDto>.Ok((await GetPortfolioDtoAsync(portfolioId, cancellationToken))!);
    }

    public async Task<List<FundTransactionDto>?> GetTransactionsAsync(Guid userId, Guid portfolioId, CancellationToken cancellationToken = default)
    {
        var owns = await _context.Portfolios
            .AnyAsync(x => x.Id == portfolioId && x.UserId == userId, cancellationToken);
        if (!owns)
        {
            return null;
        }

        var transactions = await _context.FundTransactions
            .AsNoTracking()
            .Where(x => x.PortfolioId == portfolioId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<FundTransactionDto>>(transactions);
    }

    private Task<Portfolio?> FindOwnedPortfolioAsync(Guid userId, Guid portfolioId, CancellationToken cancellationToken) =>
        _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .FirstOrDefaultAsync(x => x.Id == portfolioId && x.UserId == userId, cancellationToken);

    private async Task<PortfolioDto?> GetPortfolioDtoAsync(Guid portfolioId, CancellationToken cancellationToken)
    {
        var portfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == portfolioId, cancellationToken);

        return portfolio is null ? null : _mapper.Map<PortfolioDto>(portfolio);
    }

    private static string NormalizeCode(string code) => code.Trim().ToUpperInvariant();
}
