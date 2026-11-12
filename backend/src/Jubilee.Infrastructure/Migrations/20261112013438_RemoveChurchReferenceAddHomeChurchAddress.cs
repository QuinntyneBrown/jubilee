using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveChurchReferenceAddHomeChurchAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ADR 0041: the stages "waiting on reference" (1) and "needs a decision" (3) are gone.
            // Listings in them go to the verification team as "ready to review" (2), ready from now.
            migrationBuilder.Sql(
                "UPDATE ListingSubmissions SET ReadyAt = SYSDATETIMEOFFSET() " +
                "WHERE ReadyAt IS NULL AND ListingId IN (SELECT Id FROM Listings WHERE Stage IN (1, 3));");
            migrationBuilder.Sql("UPDATE Listings SET Stage = 2 WHERE Stage IN (1, 3);");

            migrationBuilder.DropTable(
                name: "ReferenceAnswers");

            migrationBuilder.DropTable(
                name: "ReferenceLinks");

            migrationBuilder.DropIndex(
                name: "IX_ListingSubmissions_PastorEmailKey_SubmittedAt",
                table: "ListingSubmissions");

            migrationBuilder.DropColumn(
                name: "Church",
                table: "ListingSubmissions");

            migrationBuilder.DropColumn(
                name: "PastorEmail",
                table: "ListingSubmissions");

            migrationBuilder.DropColumn(
                name: "PastorEmailKey",
                table: "ListingSubmissions");

            migrationBuilder.DropColumn(
                name: "ReferenceConfirmedOn",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "Church",
                table: "ListingDrafts");

            migrationBuilder.DropColumn(
                name: "PastorEmail",
                table: "ListingDrafts");

            migrationBuilder.DropColumn(
                name: "ReferenceDeletedAt",
                table: "ListingDecisions");

            migrationBuilder.AddColumn<string>(
                name: "HomeChurchAddress",
                table: "Members",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HomeChurchAddress",
                table: "Members");

            migrationBuilder.AddColumn<string>(
                name: "Church",
                table: "ListingSubmissions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PastorEmail",
                table: "ListingSubmissions",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PastorEmailKey",
                table: "ListingSubmissions",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReferenceConfirmedOn",
                table: "Listings",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Church",
                table: "ListingDrafts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PastorEmail",
                table: "ListingDrafts",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReferenceDeletedAt",
                table: "ListingDecisions",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReferenceAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnsweredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    LinkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Role = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReferenceAnswers_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReferenceLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Church = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    EndedBy = table.Column<int>(type: "int", nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiryNoticeSentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IssuedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReferenceEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReferenceLinks_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ListingSubmissions_PastorEmailKey_SubmittedAt",
                table: "ListingSubmissions",
                columns: new[] { "PastorEmailKey", "SubmittedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceAnswers_ListingId",
                table: "ReferenceAnswers",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceLinks_ListingId_IssuedAt",
                table: "ReferenceLinks",
                columns: new[] { "ListingId", "IssuedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceLinks_TokenHash",
                table: "ReferenceLinks",
                column: "TokenHash",
                unique: true);
        }
    }
}
