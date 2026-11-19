using FluentValidation;
using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Validators;

public class SellFundDtoValidator : AbstractValidator<SellFundDto>
{
    public SellFundDtoValidator()
    {
        RuleFor(x => x.FundCode)
            .NotEmpty()
            .WithMessage("FundCode boş olamaz.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity 0'dan büyük olmalı.");

        RuleFor(x => x.Price)
            .GreaterThan(0)
            .When(x => x.Price.HasValue)
            .WithMessage("Price 0'dan büyük olmalı.");
    }
}
