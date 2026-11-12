using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "Sessions",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                // Existing sessions, and those the previous release starts, are members' (L2-178 AC3).
                defaultValue: "Member");

            migrationBuilder.AddColumn<Guid>(
                name: "StaffMemberId",
                table: "Sessions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_StaffMemberId",
                table: "Sessions",
                column: "StaffMemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sessions_StaffMemberId",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "StaffMemberId",
                table: "Sessions");
        }
    }
}
