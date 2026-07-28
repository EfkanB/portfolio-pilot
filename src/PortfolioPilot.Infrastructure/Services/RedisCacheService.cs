using System.Text;
using Microsoft.Extensions.Caching.Distributed;
using PortfolioPilot.Application.Interfaces;

namespace PortfolioPilot.Infrastructure.Services;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _distributedCache;

    public RedisCacheService(IDistributedCache distributedCache)
    {
        _distributedCache = distributedCache;
    }

    public async Task<string?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        return await _distributedCache.GetStringAsync(key, cancellationToken);
    }

    public async Task SetAsync(string key, string value, TimeSpan? absoluteExpirationRelativeToNow = null, CancellationToken cancellationToken = default)
    {
        var options = new DistributedCacheEntryOptions();

        if (absoluteExpirationRelativeToNow.HasValue)
        {
            options.AbsoluteExpirationRelativeToNow = absoluteExpirationRelativeToNow;
        }

        await _distributedCache.SetStringAsync(key, value, options, cancellationToken);
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        await _distributedCache.RemoveAsync(key, cancellationToken);
    }
}