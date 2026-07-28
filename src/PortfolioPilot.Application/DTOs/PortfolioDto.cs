namespace PortfolioPilot.Application.DTOs;

public class PortfolioDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<InvestmentFundDto> Funds { get; set; } = new();
}