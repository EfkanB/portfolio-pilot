using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PortfolioPilot.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Stage3Updates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AverageCost",
                table: "InvestmentFunds",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AverageCost",
                table: "InvestmentFunds");
        }
    }
}
