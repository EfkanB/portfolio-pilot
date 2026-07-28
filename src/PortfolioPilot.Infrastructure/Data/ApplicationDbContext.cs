using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PortfolioPilot.Application.Interfaces;
using PortfolioPilot.Domain.Entities;

namespace PortfolioPilot.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Portfolio> Portfolios => Set<Portfolio>();
    public DbSet<InvestmentFund> InvestmentFunds => Set<InvestmentFund>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(x => x.LastName).IsRequired().HasMaxLength(100);

            entity.HasMany(x => x.Portfolios)
                .WithOne(x => x.User)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Portfolio>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).IsRequired().HasMaxLength(150);
            entity.Property(x => x.Description).HasMaxLength(1000);
            entity.Property(x => x.CreatedAt).IsRequired();

            entity.HasMany(x => x.InvestmentFunds)
                .WithOne(x => x.Portfolio)
                .HasForeignKey(x => x.PortfolioId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvestmentFund>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FundCode).IsRequired().HasMaxLength(50);
            entity.Property(x => x.FundName).IsRequired().HasMaxLength(200);
            entity.Property(x => x.CurrentPrice).HasPrecision(18, 2);
            entity.Property(x => x.AverageCost).HasPrecision(18, 2);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
        });
    }
}