using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMerchandise : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MerchOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Number = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Delivery = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    SubtotalCents = table.Column<int>(type: "int", nullable: false),
                    ShippingCents = table.Column<int>(type: "int", nullable: false),
                    TaxCents = table.Column<int>(type: "int", nullable: false),
                    TotalCents = table.Column<int>(type: "int", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    CheckoutSessionId = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    PaidAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ExpiredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    BuyerEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    BuyerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShippingAddress = table.Column<string>(type: "nvarchar(600)", maxLength: 600, nullable: true),
                    PersonalDataErasedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchOrders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchProducts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Colour = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    UnitPriceCents = table.Column<int>(type: "int", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    ShippingCents = table.Column<int>(type: "int", nullable: false),
                    FreeShippingFromCents = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchProducts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MerchVariants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProductId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Fit = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Size = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Ages = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    ChestInches = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    LengthInches = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchVariants_MerchProducts_ProductId",
                        column: x => x.ProductId,
                        principalTable: "MerchProducts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MerchOrderLines",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VariantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Fit = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Size = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPriceCents = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchOrderLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchOrderLines_MerchOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "MerchOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MerchOrderLines_MerchVariants_VariantId",
                        column: x => x.VariantId,
                        principalTable: "MerchVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrderLines_OrderId",
                table: "MerchOrderLines",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrderLines_VariantId",
                table: "MerchOrderLines",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrders_CheckoutSessionId",
                table: "MerchOrders",
                column: "CheckoutSessionId",
                unique: true,
                filter: "[CheckoutSessionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrders_Number",
                table: "MerchOrders",
                column: "Number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrders_Reference",
                table: "MerchOrders",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MerchOrders_Status_ExpiresAt",
                table: "MerchOrders",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MerchProducts_Slug",
                table: "MerchProducts",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MerchVariants_ProductId",
                table: "MerchVariants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_MerchVariants_Sku",
                table: "MerchVariants",
                column: "Sku",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MerchOrderLines");

            migrationBuilder.DropTable(
                name: "MerchOrders");

            migrationBuilder.DropTable(
                name: "MerchVariants");

            migrationBuilder.DropTable(
                name: "MerchProducts");
        }
    }
}
