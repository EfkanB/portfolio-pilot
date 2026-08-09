namespace PortfolioPilot.Application.DTOs;

public class TefasFundQuoteDto
{
    public string FundCode { get; set; } = string.Empty;
    public string FundName { get; set; } = string.Empty;
    public decimal? CurrentPrice { get; set; }
    public decimal? DailyReturnPercent { get; set; }
    public string AsOfDate { get; set; } = string.Empty;
}