using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.Domain.Entities;

namespace PortfolioPilot.Application.Services;

public class PortfolioService : IPortfolioService
{
    private readonly IApplicationDbContext _context;
    private readonly IMapper _mapper;

    public PortfolioService(IApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<PortfolioDto>> GetPortfoliosByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var portfolios = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<PortfolioDto>>(portfolios);
    }

    public async Task<PortfolioDto> CreatePortfolioAsync(Guid userId, CreatePortfolioDto dto, CancellationToken cancellationToken = default)
    {
        var portfolio = _mapper.Map<Portfolio>(dto);
        portfolio.Id = Guid.NewGuid();
        portfolio.UserId = userId;
        portfolio.CreatedAt = DateTime.UtcNow;

        _context.Portfolios.Add(portfolio);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<PortfolioDto>(portfolio);
    }

    public async Task<PortfolioDto?> AddFundAsync(Guid userId, Guid portfolioId, AddInvestmentFundDto dto, CancellationToken cancellationToken = default)
    {
        var portfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .FirstOrDefaultAsync(x => x.Id == portfolioId && x.UserId == userId, cancellationToken);

        if (portfolio is null)
        {
            return null;
        }

        // Frontend fundName göndermeyebilir; boşsa fundCode değerini kullan.
        var resolvedFundName = string.IsNullOrWhiteSpace(dto.FundName) ? dto.FundCode : dto.FundName;

        var existingFund = portfolio.InvestmentFunds.FirstOrDefault(fund => string.Equals(fund.FundCode, dto.FundCode, StringComparison.OrdinalIgnoreCase));
        if (existingFund is null)
        {
            var newFund = _mapper.Map<InvestmentFund>(dto);
            newFund.Id = Guid.NewGuid();
            newFund.PortfolioId = portfolioId;
            newFund.AverageCost = dto.CurrentPrice;
            newFund.FundName = resolvedFundName;

            _context.InvestmentFunds.Add(newFund);
        }
        else
        {
            var previousQuantity = existingFund.Quantity;
            var addedQuantity = dto.Quantity;
            var totalQuantity = previousQuantity + addedQuantity;

            existingFund.AverageCost = totalQuantity == 0
                ? dto.CurrentPrice
                : ((previousQuantity * existingFund.AverageCost) + (addedQuantity * dto.CurrentPrice)) / totalQuantity;
            existingFund.Quantity = totalQuantity;
            existingFund.CurrentPrice = dto.CurrentPrice;
            existingFund.FundName = string.IsNullOrWhiteSpace(dto.FundName) ? existingFund.FundName : dto.FundName;
        }


        await _context.SaveChangesAsync(cancellationToken);

        var refreshedPortfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .AsNoTracking()
            .FirstAsync(x => x.Id == portfolioId, cancellationToken);

        return _mapper.Map<PortfolioDto>(refreshedPortfolio);
    }

    public async Task<PortfolioDto?> DeleteFundAsync(Guid userId, Guid portfolioId, Guid fundId, CancellationToken cancellationToken = default)
    {
        var portfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .FirstOrDefaultAsync(x => x.Id == portfolioId && x.UserId == userId, cancellationToken);

        if (portfolio is null)
        {
            return null;
        }

        var fund = portfolio.InvestmentFunds.FirstOrDefault(f => f.Id == fundId);
        if (fund is null)
        {
            return null;
        }

        _context.InvestmentFunds.Remove(fund);
        await _context.SaveChangesAsync(cancellationToken);

        var refreshedPortfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .AsNoTracking()
            .FirstAsync(x => x.Id == portfolioId, cancellationToken);

        return _mapper.Map<PortfolioDto>(refreshedPortfolio);
    }

    public async Task<PortfolioDto?> SellFundAsync(Guid userId, Guid portfolioId, SellFundDto dto, CancellationToken cancellationToken = default)
    {
        var portfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .FirstOrDefaultAsync(x => x.Id == portfolioId && x.UserId == userId, cancellationToken);

        if (portfolio is null)
        {
            return null;
        }

        var fund = portfolio.InvestmentFunds.FirstOrDefault(f =>
            string.Equals(f.FundCode, dto.FundCode, StringComparison.OrdinalIgnoreCase));

        if (fund is null)
        {
            return null;
        }

        // If sell quantity >= current quantity, remove the fund entirely
        if (dto.Quantity >= fund.Quantity)
        {
            _context.InvestmentFunds.Remove(fund);
        }
        else
        {
            // Otherwise, only reduce the quantity — NEVER change AverageCost
            fund.Quantity -= dto.Quantity;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var refreshedPortfolio = await _context.Portfolios
            .Include(x => x.InvestmentFunds)
            .AsNoTracking()
            .FirstAsync(x => x.Id == portfolioId, cancellationToken);

        return _mapper.Map<PortfolioDto>(refreshedPortfolio);
    }
}
