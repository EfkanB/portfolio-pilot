namespace PortfolioPilot.Application.DTOs;

public class AddInvestmentFundDto
{
    public string FundCode { get; set; } = string.Empty;
    public string? FundName { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal AverageCost { get; set; }
    public decimal Quantity { get; set; }
}