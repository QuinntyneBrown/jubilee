using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessPreRegistrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BusinessPreRegistrations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BusinessName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ContactName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    EmailKey = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    CategorySlug = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Area = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Website = table.Column<string>(type: "nvarchar(208)", maxLength: 208, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ConsentedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ConsentMethod = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BusinessPreRegistrations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BusinessPreRegistrations_CreatedAt",
                table: "BusinessPreRegistrations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BusinessPreRegistrations_EmailKey",
                table: "BusinessPreRegistrations",
                column: "EmailKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BusinessPreRegistrations");
        }
    }
}
