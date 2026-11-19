namespace PortfolioPilot.Application.DTOs;

public class SellFundDto
{
    public string FundCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }

    /// <summary>Execution price. When omitted the fund's current price is used.</summary>
    public decimal? Price { get; set; }
}
