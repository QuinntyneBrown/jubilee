using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityAlerts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SecurityAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Count = table.Column<int>(type: "int", nullable: false),
                    RaisedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityAlerts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetRequests_RequestedAt",
                table: "PasswordResetRequests",
                column: "RequestedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityAlerts_Kind_RaisedAt",
                table: "SecurityAlerts",
                columns: new[] { "Kind", "RaisedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SecurityAlerts");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetRequests_RequestedAt",
                table: "PasswordResetRequests");
        }
    }
}
