using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.Infrastructure.Data;
using PortfolioPilot.WebAPI.Hubs;
using System.Security.Claims;

namespace PortfolioPilot.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PortfolioController : ControllerBase
{
    private readonly IPortfolioService _portfolioService;
    private readonly IApplicationDbContext _context;
    private readonly IHubContext<PortfolioHub> _hubContext;
    private readonly IFinanceApiService _financeApiService;

    public PortfolioController(IPortfolioService portfolioService, IApplicationDbContext context, IHubContext<PortfolioHub> hubContext, IFinanceApiService financeApiService)
    {
        _portfolioService = portfolioService;
        _context = context;
        _hubContext = hubContext;
        _financeApiService = financeApiService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPortfolios(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var portfolios = await _portfolioService.GetPortfoliosByUserIdAsync(userId, cancellationToken);
        return Ok(portfolios);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePortfolio([FromBody] CreatePortfolioDto dto, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var portfolio = await _portfolioService.CreatePortfolioAsync(userId, dto, cancellationToken);
        return CreatedAtAction(nameof(GetPortfolios), new { }, portfolio);
    }

    [HttpGet("current-price/{fundCode}")]
    public async Task<IActionResult> GetCurrentPrice([FromRoute] string fundCode, CancellationToken cancellationToken)
    {
        var currentPrice = await _financeApiService.GetFundPriceAsync(fundCode, cancellationToken);

        if (currentPrice is null)
        {
            return NotFound();
        }

        return Ok(new
        {
            fundCode,
            currentPrice
        });
    }

    [HttpPost("simulate-price")]
    public async Task<IActionResult> SimulatePrice(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var portfolio = await _context.Portfolios
            .Include(portfolio => portfolio.InvestmentFunds)
            .AsNoTracking()
            .FirstOrDefaultAsync(portfolio => portfolio.UserId == userId, cancellationToken);

        var fund = portfolio?.InvestmentFunds.OrderBy(_ => Guid.NewGuid()).FirstOrDefault();

        if (fund is null)
        {
            return NotFound();
        }

        var random = Random.Shared.Next(80, 120) / 10m;
        var newPrice = Math.Round(fund.CurrentPrice == 0 ? random : fund.CurrentPrice * random / 10m, 2);

        await _hubContext.Clients.All.SendAsync("ReceivePriceUpdate", fund.FundCode, newPrice, cancellationToken);

        return Ok(new { fundCode = fund.FundCode, newPrice });
    }

    [HttpPost("{portfolioId}/funds")]
    public async Task<IActionResult> AddFund([FromRoute] Guid portfolioId, [FromBody] AddInvestmentFundDto dto, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var portfolio = await _portfolioService.AddFundAsync(userId, portfolioId, dto, cancellationToken);
        if (portfolio is null)
        {
            return NotFound();
        }

        return Ok(portfolio);
    }

    [HttpDelete("{portfolioId}/funds/{fundId}")]
    public async Task<IActionResult> DeleteFund([FromRoute] Guid portfolioId, [FromRoute] Guid fundId, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var portfolio = await _portfolioService.DeleteFundAsync(userId, portfolioId, fundId, cancellationToken);
        if (portfolio is null)
        {
            return NotFound();
        }

        return Ok(portfolio);
    }

    [HttpPost("{portfolioId}/funds/sell")]
    public async Task<IActionResult> SellFund([FromRoute] Guid portfolioId, [FromBody] SellFundDto dto, CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var portfolio = await _portfolioService.SellFundAsync(userId, portfolioId, dto, cancellationToken);
        if (portfolio is null)
        {
            return NotFound();
        }

        return Ok(portfolio);
    }
}
