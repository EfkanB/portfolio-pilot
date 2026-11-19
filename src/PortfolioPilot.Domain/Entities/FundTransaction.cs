namespace PortfolioPilot.Domain.Entities;

public enum TransactionType
{
    Buy = 1,
    Sell = 2,
}

/// <summary>
/// Immutable ledger entry for a buy or sell. Kept per portfolio + fund code
/// (not per InvestmentFund row) so history survives a position being fully sold.
/// </summary>
public class FundTransaction
{
    public Guid Id { get; set; }
    public Guid PortfolioId { get; set; }
    public string FundCode { get; set; } = string.Empty;
    public string FundName { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }

    /// <summary>Average cost of the position at the moment of the trade.</summary>
    public decimal AverageCostAtTrade { get; set; }

    /// <summary>(Price − AverageCostAtTrade) × Quantity for sells; null for buys.</summary>
    public decimal? RealizedProfitLoss { get; set; }

    public DateTime CreatedAt { get; set; }

    public Portfolio? Portfolio { get; set; }
}
