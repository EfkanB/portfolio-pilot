using Microsoft.AspNetCore.Mvc;
using PortfolioPilot.Application.Interfaces;

namespace PortfolioPilot.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TefasController : ControllerBase
{
    private static readonly string[] DefaultFundCodes = ["AFT", "PBR", "OJK", "DBH"];

    private readonly ITefasFundService _tefasFundService;

    public TefasController(ITefasFundService tefasFundService)
    {
        _tefasFundService = tefasFundService;
    }

    [HttpGet("funds")]
    public async Task<IActionResult> GetFunds([FromQuery] string? codes, CancellationToken cancellationToken)
    {
        var fundCodes = string.IsNullOrWhiteSpace(codes)
            ? DefaultFundCodes
            : codes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var quotes = await _tefasFundService.GetFundQuotesAsync(fundCodes, cancellationToken);
        return Ok(quotes);
    }

    [HttpGet("quote/{fundCode}")]
    public async Task<IActionResult> GetQuote([FromRoute] string fundCode, CancellationToken cancellationToken)
    {
        var quote = await _tefasFundService.GetFundQuoteAsync(fundCode, cancellationToken);
        return quote is null ? NotFound() : Ok(quote);
    }
}