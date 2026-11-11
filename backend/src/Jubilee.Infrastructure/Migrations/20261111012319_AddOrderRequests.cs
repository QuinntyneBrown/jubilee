using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeliveryLabel",
                table: "Requests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ItemCents",
                table: "Requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionLabel",
                table: "Requests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "Requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddress",
                table: "Requests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShippingCents",
                table: "Requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalCents",
                table: "Requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UnitPriceCents",
                table: "Requests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FreeShippingOverCents",
                table: "Listings",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DeliveryMethods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    FeeCents = table.Column<int>(type: "int", nullable: false),
                    Estimate = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryMethods", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryMethods_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryMethods_ListingId_Position",
                table: "DeliveryMethods",
                columns: new[] { "ListingId", "Position" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeliveryMethods");

            migrationBuilder.DropColumn(
                name: "DeliveryLabel",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "ItemCents",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "OptionLabel",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "ShippingAddress",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "ShippingCents",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "TotalCents",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "UnitPriceCents",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "FreeShippingOverCents",
                table: "Listings");
        }
    }
}
