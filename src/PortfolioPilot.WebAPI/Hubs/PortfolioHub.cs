using Microsoft.AspNetCore.SignalR;

namespace PortfolioPilot.WebAPI.Hubs;

public class PortfolioHub : Hub
{
    public async Task SendPriceUpdate(string fundCode, decimal newPrice)
    {
        await Clients.All.SendAsync("ReceivePriceUpdate", fundCode, newPrice);
    }
}