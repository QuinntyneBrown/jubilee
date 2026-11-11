using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddListingOnboarding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ListingDrafts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerSubject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Tagline = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CategorySlug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    Highlight = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    Place = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Church = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PastorEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    Agreed = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    NoticeSentAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingDrafts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ListingSubmissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerSubject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Church = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PastorEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    PastorEmailKey = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    ReferenceToken = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    StatementVersion = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AgreedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    SubmittedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Flags = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListingSubmissions_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DraftItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingDraftId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Detail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PriceKind = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    PriceCents = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DraftItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DraftItems_ListingDrafts_ListingDraftId",
                        column: x => x.ListingDraftId,
                        principalTable: "ListingDrafts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DraftItems_ListingDraftId",
                table: "DraftItems",
                column: "ListingDraftId");

            migrationBuilder.CreateIndex(
                name: "IX_ListingDrafts_OwnerSubject_UpdatedAt",
                table: "ListingDrafts",
                columns: new[] { "OwnerSubject", "UpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ListingDrafts_UpdatedAt",
                table: "ListingDrafts",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ListingSubmissions_ListingId",
                table: "ListingSubmissions",
                column: "ListingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListingSubmissions_OwnerSubject_IdempotencyKey",
                table: "ListingSubmissions",
                columns: new[] { "OwnerSubject", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListingSubmissions_PastorEmailKey_SubmittedAt",
                table: "ListingSubmissions",
                columns: new[] { "PastorEmailKey", "SubmittedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DraftItems");

            migrationBuilder.DropTable(
                name: "ListingSubmissions");

            migrationBuilder.DropTable(
                name: "ListingDrafts");
        }
    }
}
