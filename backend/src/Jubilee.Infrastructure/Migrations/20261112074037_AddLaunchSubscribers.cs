using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLaunchSubscribers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LaunchSubscribers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    EmailKey = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ConsentedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ConsentMethod = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LaunchSubscribers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LaunchSubscribers_CreatedAt",
                table: "LaunchSubscribers",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LaunchSubscribers_EmailKey",
                table: "LaunchSubscribers",
                column: "EmailKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LaunchSubscribers");
        }
    }
}
