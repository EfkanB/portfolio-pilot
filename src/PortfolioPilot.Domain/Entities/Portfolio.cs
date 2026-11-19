namespace PortfolioPilot.Domain.Entities;

public class Portfolio
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
    public ICollection<InvestmentFund> InvestmentFunds { get; set; } = new List<InvestmentFund>();
    public ICollection<FundTransaction> Transactions { get; set; } = new List<FundTransaction>();
}