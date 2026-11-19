using FluentValidation;
using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Validators;

public class CreatePortfolioDtoValidator : AbstractValidator<CreatePortfolioDto>
{
    public CreatePortfolioDtoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Portföy adı boş olamaz.")
            .MaximumLength(150)
            .WithMessage("Portföy adı en fazla 150 karakter olabilir.");

        RuleFor(x => x.Description)
            .MaximumLength(1000)
            .WithMessage("Açıklama en fazla 1000 karakter olabilir.");
    }
}
