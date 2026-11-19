using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Validators;

namespace PortfolioPilot.Application.Tests;

public class ValidatorTests
{
    [Theory]
    [InlineData("AFT", 1, 1, true)]
    [InlineData("", 1, 1, false)]
    [InlineData("AFT", 0, 1, false)]
    [InlineData("AFT", 1, 0, false)]
    [InlineData("AFT", -1, 1, false)]
    public void AddInvestmentFund(string code, decimal quantity, decimal price, bool expected)
    {
        var result = new AddInvestmentFundDtoValidator().Validate(new AddInvestmentFundDto
        {
            FundCode = code,
            Quantity = quantity,
            CurrentPrice = price,
        });

        Assert.Equal(expected, result.IsValid);
    }

    [Theory]
    [InlineData("AFT", 1, null, true)]
    [InlineData("AFT", 1, 2.5, true)]
    [InlineData("AFT", 0, null, false)]
    [InlineData("AFT", 1, 0.0, false)]
    [InlineData(" ", 1, null, false)]
    public void SellFund(string code, decimal quantity, double? price, bool expected)
    {
        var result = new SellFundDtoValidator().Validate(new SellFundDto
        {
            FundCode = code,
            Quantity = quantity,
            Price = (decimal?)price,
        });

        Assert.Equal(expected, result.IsValid);
    }

    [Fact]
    public void CreatePortfolio_requires_name()
    {
        var validator = new CreatePortfolioDtoValidator();

        Assert.False(validator.Validate(new CreatePortfolioDto { Name = "" }).IsValid);
        Assert.False(validator.Validate(new CreatePortfolioDto { Name = new string('a', 151) }).IsValid);
        Assert.True(validator.Validate(new CreatePortfolioDto { Name = "BES" }).IsValid);
    }
}
