using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PortfolioPilot.WebAPI.Hubs;

/// <summary>
/// Server-to-client only. Price updates are pushed per user via
/// <c>Clients.User(userId)</c> (user id = NameIdentifier claim), so a client
/// only ever receives updates for funds it actually holds.
/// </summary>
[Authorize]
public class PortfolioHub : Hub
{
    public const string PriceUpdateMethod = "ReceivePriceUpdate";
}
