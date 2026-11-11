using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ManageProfileAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EmailDailySummary",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Members",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "Members",
                type: "nvarchar(7)",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ProfileSavedAt",
                table: "Members",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pronouns",
                table: "Members",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetEmail",
                table: "LinkTokens",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ConsentRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Given = table.Column<bool>(type: "bit", nullable: false),
                    Method = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsentRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsentRecords_Members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "Members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConsentRecords_MemberId_OccurredAt",
                table: "ConsentRecords",
                columns: new[] { "MemberId", "OccurredAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConsentRecords");

            migrationBuilder.DropColumn(
                name: "EmailDailySummary",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "ProfileSavedAt",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "Pronouns",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "TargetEmail",
                table: "LinkTokens");
        }
    }
}
