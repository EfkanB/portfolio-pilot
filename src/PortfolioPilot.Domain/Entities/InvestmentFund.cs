namespace PortfolioPilot.Domain.Entities;

public class InvestmentFund
{
    public Guid Id { get; set; }
    public Guid PortfolioId { get; set; }
    public string FundCode { get; set; } = string.Empty;
    public string FundName { get; set; } = string.Empty;
    public decimal CurrentPrice { get; set; }
    public decimal AverageCost { get; set; }
    public decimal Quantity { get; set; }

    public Portfolio? Portfolio { get; set; }
}