using Microsoft.AspNetCore.Mvc;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Application.Interfaces;

namespace PortfolioPilot.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(dto, cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
    {
        var token = await _authService.LoginAsync(dto, cancellationToken);

        if (token is null)
        {
            return Unauthorized();
        }

        return Ok(new { token });
    }
}