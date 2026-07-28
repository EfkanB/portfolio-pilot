using Microsoft.AspNetCore.Identity;
using PortfolioPilot.Application.DTOs;

namespace PortfolioPilot.Application.Interfaces;

public interface IAuthService
{
    Task<IdentityResult> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<string?> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
}