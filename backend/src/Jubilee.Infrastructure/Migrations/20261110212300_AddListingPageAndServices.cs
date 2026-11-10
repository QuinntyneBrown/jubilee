using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddListingPageAndServices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "About",
                table: "Listings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Credentials",
                table: "Listings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "Delivery",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Hours",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Listings",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Services");

            // Existing listings of the Shops category are shops.
            migrationBuilder.Sql("UPDATE Listings SET Kind = 'Shop' WHERE CategorySlug = 'shops'");

            migrationBuilder.AddColumn<string>(
                name: "Languages",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MadeToOrder",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerName",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Where",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Detail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PriceKind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    PriceCents = table.Column<int>(type: "int", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Services_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Services_ListingId_Position",
                table: "Services",
                columns: new[] { "ListingId", "Position" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Services");

            migrationBuilder.DropColumn(
                name: "About",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Credentials",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Delivery",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Hours",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Languages",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "MadeToOrder",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "OwnerName",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Where",
                table: "Listings");
        }
    }
}
