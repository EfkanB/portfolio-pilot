namespace PortfolioPilot.Application.Interfaces;

public interface ICacheService
{
    Task<string?> GetAsync(string key, CancellationToken cancellationToken = default);
    Task SetAsync(string key, string value, TimeSpan? absoluteExpirationRelativeToNow = null, CancellationToken cancellationToken = default);
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}