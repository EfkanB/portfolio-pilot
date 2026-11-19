using FluentValidation;
using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Validators;

public class AddInvestmentFundDtoValidator : AbstractValidator<AddInvestmentFundDto>
{
    public AddInvestmentFundDtoValidator()
    {
        RuleFor(x => x.FundCode)
            .NotEmpty()
            .WithMessage("FundCode boş olamaz.")
            .MaximumLength(50)
            .WithMessage("FundCode en fazla 50 karakter olabilir.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity 0'dan büyük olmalı.");

        RuleFor(x => x.CurrentPrice)
            .GreaterThan(0)
            .WithMessage("CurrentPrice 0'dan büyük olmalı.");
    }
}
