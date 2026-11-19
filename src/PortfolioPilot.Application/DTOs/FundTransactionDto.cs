namespace PortfolioPilot.Application.DTOs;

public class FundTransactionDto
{
    public Guid Id { get; set; }
    public Guid PortfolioId { get; set; }
    public string FundCode { get; set; } = string.Empty;
    public string FundName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal AverageCostAtTrade { get; set; }
    public decimal? RealizedProfitLoss { get; set; }
    public DateTime CreatedAt { get; set; }
}
