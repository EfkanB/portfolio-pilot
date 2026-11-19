using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.Common;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Mappings;
using PortfolioPilot.Application.Services;
using PortfolioPilot.Domain.Entities;
using PortfolioPilot.Infrastructure.Data;

namespace PortfolioPilot.Application.Tests;

public class PortfolioServiceTests : IDisposable
{
    private static readonly IMapper Mapper =
        new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).CreateMapper();

    private readonly ApplicationDbContext _context;
    private readonly PortfolioService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _portfolioId;

    public PortfolioServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new PortfolioService(_context, Mapper);

        var portfolio = new Portfolio
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Name = "Test",
            CreatedAt = DateTime.UtcNow,
        };
        _context.Portfolios.Add(portfolio);
        _context.SaveChanges();
        _portfolioId = portfolio.Id;
    }

    public void Dispose() => _context.Dispose();

    private Task<PortfolioDto?> Buy(string code, decimal quantity, decimal price, Guid? userId = null) =>
        _service.AddFundAsync(userId ?? _userId, _portfolioId, new AddInvestmentFundDto
        {
            FundCode = code,
            Quantity = quantity,
            CurrentPrice = price,
        });

    private Task<ServiceResult<PortfolioDto>> Sell(string code, decimal quantity, decimal? price = null) =>
        _service.SellFundAsync(_userId, _portfolioId, new SellFundDto
        {
            FundCode = code,
            Quantity = quantity,
            Price = price,
        });

    [Fact]
    public void Mapping_configuration_is_valid()
    {
        new MapperConfiguration(cfg => cfg.AddProfile<MappingProfile>()).AssertConfigurationIsValid();
    }

    [Fact]
    public async Task Buying_a_new_fund_sets_average_cost_to_price_and_normalizes_code()
    {
        var result = await Buy(" aft ", 10, 1.234567m);

        var fund = Assert.Single(result!.Funds);
        Assert.Equal("AFT", fund.FundCode);
        Assert.Equal("AFT", fund.FundName);
        Assert.Equal(10, fund.Quantity);
        Assert.Equal(1.234567m, fund.AverageCost);
        Assert.Equal(1.234567m, fund.CurrentPrice);
    }

    [Fact]
    public async Task Buying_more_of_same_fund_uses_weighted_average_cost()
    {
        await Buy("AFT", 10, 2m);
        var result = await Buy("aft", 30, 4m);

        var fund = Assert.Single(result!.Funds);
        Assert.Equal(40, fund.Quantity);
        // (10*2 + 30*4) / 40 = 3.5
        Assert.Equal(3.5m, fund.AverageCost);
        Assert.Equal(4m, fund.CurrentPrice);
    }

    [Fact]
    public async Task Buying_into_another_users_portfolio_returns_null()
    {
        var result = await Buy("AFT", 1, 1m, userId: Guid.NewGuid());

        Assert.Null(result);
        Assert.Empty(_context.InvestmentFunds);
        Assert.Empty(_context.FundTransactions);
    }

    [Fact]
    public async Task Partial_sell_reduces_quantity_keeps_average_cost_and_records_realized_pl()
    {
        await Buy("AFT", 10, 2m);
        await Buy("AFT", 10, 4m); // avg cost 3

        var result = await Sell("AFT", 5, price: 5m);

        Assert.True(result.IsSuccess);
        var fund = Assert.Single(result.Value!.Funds);
        Assert.Equal(15, fund.Quantity);
        Assert.Equal(3m, fund.AverageCost);

        var sell = Assert.Single(_context.FundTransactions, t => t.Type == TransactionType.Sell);
        Assert.Equal(5, sell.Quantity);
        Assert.Equal(5m, sell.Price);
        Assert.Equal(3m, sell.AverageCostAtTrade);
        Assert.Equal(10m, sell.RealizedProfitLoss); // (5 - 3) * 5
    }

    [Fact]
    public async Task Selling_entire_position_removes_fund_but_keeps_history()
    {
        await Buy("AFT", 10, 2m);

        var result = await Sell("AFT", 10, price: 1.5m);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Funds);

        var transactions = await _service.GetTransactionsAsync(_userId, _portfolioId);
        Assert.Equal(2, transactions!.Count);
        Assert.Equal("Sell", transactions[0].Type); // newest first
        Assert.Equal(-5m, transactions[0].RealizedProfitLoss); // (1.5 - 2) * 10
        Assert.Equal("Buy", transactions[1].Type);
        Assert.Null(transactions[1].RealizedProfitLoss);
    }

    [Fact]
    public async Task Selling_without_price_uses_current_price()
    {
        await Buy("AFT", 4, 2m);
        var fund = _context.InvestmentFunds.Single();
        fund.CurrentPrice = 2.5m;
        await _context.SaveChangesAsync();

        var result = await Sell("AFT", 2);

        Assert.True(result.IsSuccess);
        var sell = _context.FundTransactions.Single(t => t.Type == TransactionType.Sell);
        Assert.Equal(2.5m, sell.Price);
        Assert.Equal(1m, sell.RealizedProfitLoss);
    }

    [Fact]
    public async Task Overselling_is_rejected_and_changes_nothing()
    {
        await Buy("AFT", 3, 2m);

        var result = await Sell("AFT", 5, price: 2m);

        Assert.Equal(ServiceResultStatus.Invalid, result.Status);
        Assert.Equal(3, _context.InvestmentFunds.Single().Quantity);
        Assert.DoesNotContain(_context.FundTransactions, t => t.Type == TransactionType.Sell);
    }

    [Fact]
    public async Task Selling_unknown_fund_returns_not_found()
    {
        var result = await Sell("XYZ", 1, price: 1m);

        Assert.Equal(ServiceResultStatus.NotFound, result.Status);
    }

    [Fact]
    public async Task Transactions_of_foreign_portfolio_are_not_returned()
    {
        await Buy("AFT", 1, 1m);

        var transactions = await _service.GetTransactionsAsync(Guid.NewGuid(), _portfolioId);

        Assert.Null(transactions);
    }

    [Fact]
    public async Task Deleting_a_fund_does_not_create_a_sell_transaction()
    {
        var portfolio = await Buy("AFT", 1, 1m);
        var fundId = portfolio!.Funds.Single().Id;

        var result = await _service.DeleteFundAsync(_userId, _portfolioId, fundId);

        Assert.Empty(result!.Funds);
        Assert.Single(_context.FundTransactions); // only the original buy
    }
}
