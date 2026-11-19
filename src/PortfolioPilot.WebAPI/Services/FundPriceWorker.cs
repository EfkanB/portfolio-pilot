using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.Domain.Entities;
using PortfolioPilot.WebAPI.Hubs;

namespace PortfolioPilot.WebAPI.Services;

public class FundPriceWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FundPriceWorker> _logger;

    public FundPriceWorker(IServiceScopeFactory scopeFactory, ILogger<FundPriceWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);

        await RefreshPricesAsync(stoppingToken);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RefreshPricesAsync(stoppingToken);
        }
    }

    private async Task RefreshPricesAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var financeApiService = scope.ServiceProvider.GetRequiredService<IFinanceApiService>();
            var hubContext = scope.ServiceProvider.GetRequiredService<IHubContext<PortfolioHub>>();

            var funds = await context.InvestmentFunds
                .Include(fund => fund.Portfolio)
                .AsTracking()
                .ToListAsync(cancellationToken);

            if (funds.Count == 0)
            {
                return;
            }

            var updatedCount = 0;

            foreach (var fundGroup in funds
                         .Where(fund => !string.IsNullOrWhiteSpace(fund.FundCode))
                         .GroupBy(fund => fund.FundCode, StringComparer.OrdinalIgnoreCase))
            {
                var latestPrice = await financeApiService.GetFundPriceAsync(fundGroup.Key, cancellationToken);
                if (latestPrice is null)
                {
                    continue;
                }

                foreach (var fund in fundGroup)
                {
                    fund.CurrentPrice = latestPrice.Value;
                    updatedCount++;
                }

                var ownerIds = fundGroup
                    .Where(fund => fund.Portfolio is not null)
                    .Select(fund => fund.Portfolio!.UserId.ToString())
                    .Distinct()
                    .ToList();

                if (ownerIds.Count > 0)
                {
                    await hubContext.Clients.Users(ownerIds)
                        .SendAsync(PortfolioHub.PriceUpdateMethod, fundGroup.Key, latestPrice.Value, cancellationToken);
                }
            }

            if (updatedCount > 0)
            {
                await context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Updated {Count} fund price values from finance API.", updatedCount);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Fund price refresh cycle failed.");
        }
    }
}