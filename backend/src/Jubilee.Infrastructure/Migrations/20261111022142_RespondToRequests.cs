using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RespondToRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UndoableUntil",
                table: "RequestTransitions",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeclineMessage",
                table: "Requests",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeclineReason",
                table: "Requests",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CorrelationId",
                table: "OutboxMessages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ResponseTimeStats",
                columns: table => new
                {
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MedianFirstResponse = table.Column<TimeSpan>(type: "time", nullable: true),
                    ResponseCount = table.Column<int>(type: "int", nullable: false),
                    RepliesFast = table.Column<bool>(type: "bit", nullable: false),
                    ComputedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponseTimeStats", x => x.ListingId);
                    table.ForeignKey(
                        name: "FK_ResponseTimeStats_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_CorrelationId",
                table: "OutboxMessages",
                column: "CorrelationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResponseTimeStats");

            migrationBuilder.DropIndex(
                name: "IX_OutboxMessages_CorrelationId",
                table: "OutboxMessages");

            migrationBuilder.DropColumn(
                name: "UndoableUntil",
                table: "RequestTransitions");

            migrationBuilder.DropColumn(
                name: "DeclineMessage",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "DeclineReason",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "CorrelationId",
                table: "OutboxMessages");
        }
    }
}
