using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.Common;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.WebAPI.Hubs;
using System.Security.Claims;

namespace PortfolioPilot.WebAPI.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PortfolioController : ControllerBase
{
    private readonly IPortfolioService _portfolioService;
    private readonly IApplicationDbContext _context;
    private readonly IHubContext<PortfolioHub> _hubContext;
    private readonly IFinanceApiService _financeApiService;
    private readonly IWebHostEnvironment _environment;

    public PortfolioController(
        IPortfolioService portfolioService,
        IApplicationDbContext context,
        IHubContext<PortfolioHub> hubContext,
        IFinanceApiService financeApiService,
        IWebHostEnvironment environment)
    {
        _portfolioService = portfolioService;
        _context = context;
        _hubContext = hubContext;
        _financeApiService = financeApiService;
        _environment = environment;
    }

    /// <summary>[Authorize] guarantees an authenticated principal; the claim is set by AuthService.</summary>
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetPortfolios(CancellationToken cancellationToken)
    {
        var portfolios = await _portfolioService.GetPortfoliosByUserIdAsync(CurrentUserId, cancellationToken);
        return Ok(portfolios);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePortfolio([FromBody] CreatePortfolioDto dto, CancellationToken cancellationToken)
    {
        var portfolio = await _portfolioService.CreatePortfolioAsync(CurrentUserId, dto, cancellationToken);
        return CreatedAtAction(nameof(GetPortfolios), new { }, portfolio);
    }

    [HttpDelete("{portfolioId:guid}")]
    public async Task<IActionResult> DeletePortfolio([FromRoute] Guid portfolioId, CancellationToken cancellationToken)
    {
        var deleted = await _portfolioService.DeletePortfolioAsync(CurrentUserId, portfolioId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("current-price/{fundCode}")]
    public async Task<IActionResult> GetCurrentPrice([FromRoute] string fundCode, CancellationToken cancellationToken)
    {
        var currentPrice = await _financeApiService.GetFundPriceAsync(fundCode, cancellationToken);
        return currentPrice is null ? NotFound() : Ok(new { fundCode, currentPrice });
    }

    /// <summary>Development helper: pushes a random price for one of the caller's funds to the caller only.</summary>
    [HttpPost("simulate-price")]
    public async Task<IActionResult> SimulatePrice(CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
        {
            return NotFound();
        }

        var userId = CurrentUserId;
        var funds = await _context.InvestmentFunds
            .AsNoTracking()
            .Where(fund => fund.Portfolio!.UserId == userId)
            .ToListAsync(cancellationToken);

        if (funds.Count == 0)
        {
            return NotFound();
        }

        var fund = funds[Random.Shared.Next(funds.Count)];
        var factor = Random.Shared.Next(80, 120) / 100m;
        var newPrice = Math.Round(fund.CurrentPrice == 0 ? factor * 10m : fund.CurrentPrice * factor, 6);

        await _hubContext.Clients.User(userId.ToString())
            .SendAsync(PortfolioHub.PriceUpdateMethod, fund.FundCode, newPrice, cancellationToken);

        return Ok(new { fundCode = fund.FundCode, newPrice });
    }

    [HttpPost("{portfolioId:guid}/funds")]
    public async Task<IActionResult> AddFund([FromRoute] Guid portfolioId, [FromBody] AddInvestmentFundDto dto, CancellationToken cancellationToken)
    {
        var portfolio = await _portfolioService.AddFundAsync(CurrentUserId, portfolioId, dto, cancellationToken);
        return portfolio is null ? NotFound() : Ok(portfolio);
    }

    [HttpDelete("{portfolioId:guid}/funds/{fundId:guid}")]
    public async Task<IActionResult> DeleteFund([FromRoute] Guid portfolioId, [FromRoute] Guid fundId, CancellationToken cancellationToken)
    {
        var portfolio = await _portfolioService.DeleteFundAsync(CurrentUserId, portfolioId, fundId, cancellationToken);
        return portfolio is null ? NotFound() : Ok(portfolio);
    }

    [HttpPost("{portfolioId:guid}/funds/sell")]
    public async Task<IActionResult> SellFund([FromRoute] Guid portfolioId, [FromBody] SellFundDto dto, CancellationToken cancellationToken)
    {
        var result = await _portfolioService.SellFundAsync(CurrentUserId, portfolioId, dto, cancellationToken);

        return result.Status switch
        {
            ServiceResultStatus.Success => Ok(result.Value),
            ServiceResultStatus.NotFound => NotFound(new { message = result.Error }),
            _ => BadRequest(new { message = result.Error }),
        };
    }

    [HttpGet("{portfolioId:guid}/transactions")]
    public async Task<IActionResult> GetTransactions([FromRoute] Guid portfolioId, CancellationToken cancellationToken)
    {
        var transactions = await _portfolioService.GetTransactionsAsync(CurrentUserId, portfolioId, cancellationToken);
        return transactions is null ? NotFound() : Ok(transactions);
    }
}
