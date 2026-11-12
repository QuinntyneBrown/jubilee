using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MemberFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Feedback",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    MemberSubject = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MemberName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MayContact = table.Column<bool>(type: "bit", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FindingScore = table.Column<int>(type: "int", nullable: true),
                    ListingScore = table.Column<int>(type: "int", nullable: true),
                    MessagingScore = table.Column<int>(type: "int", nullable: true),
                    TrustScore = table.Column<int>(type: "int", nullable: true),
                    Reply = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    Place = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    Happened = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Expected = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Frequency = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true),
                    Screen = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    AppVersion = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BusinessName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Chips = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShowOnPage = table.Column<bool>(type: "bit", nullable: false),
                    Moment = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Feedback", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Feedback_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "FeedbackScreenshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeedbackId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UploaderSubject = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Content = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeedbackScreenshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeedbackScreenshots_Feedback_FeedbackId",
                        column: x => x.FeedbackId,
                        principalTable: "Feedback",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Feedback_ListingId",
                table: "Feedback",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_Feedback_MemberSubject_CreatedAt",
                table: "Feedback",
                columns: new[] { "MemberSubject", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Feedback_MemberSubject_IdempotencyKey",
                table: "Feedback",
                columns: new[] { "MemberSubject", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Feedback_Reference",
                table: "Feedback",
                column: "Reference",
                unique: true,
                filter: "[Reference] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FeedbackScreenshots_FeedbackId",
                table: "FeedbackScreenshots",
                column: "FeedbackId");

            migrationBuilder.CreateIndex(
                name: "IX_FeedbackScreenshots_UploaderSubject_CreatedAt",
                table: "FeedbackScreenshots",
                columns: new[] { "UploaderSubject", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeedbackScreenshots");

            migrationBuilder.DropTable(
                name: "Feedback");
        }
    }
}
