using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ShipWithoutVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ADR 0053: nobody verifies a listing. A listing its owner submitted (ready to review, 2, or changes
            // requested, 4) was asked to go live, so it is live from when it was submitted. A declined listing (6)
            // is closed as before: deleted, back at the Draft stage the enum still has. Then the review data goes.
            migrationBuilder.Sql(
                """
                UPDATE l SET l.Stage = 5, l.ApprovedAt = COALESCE(l.ApprovedAt, s.SubmittedAt, l.CreatedAt)
                FROM Listings AS l LEFT JOIN ListingSubmissions AS s ON s.ListingId = l.Id
                WHERE l.Stage IN (2, 4);
                UPDATE Listings SET Stage = 0, DeletedAt = COALESCE(DeletedAt, SYSDATETIMEOFFSET()) WHERE Stage = 6;
                """);

            migrationBuilder.DropTable(
                name: "ListingDecisions");

            migrationBuilder.DropTable(
                name: "ReviewTicks");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "RecheckRequestedAt",
                table: "Listings");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TakenDownAt",
                table: "Listings",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.RenameColumn(
                name: "ApprovedAt",
                table: "Listings",
                newName: "PublishedAt");

            migrationBuilder.AddColumn<string>(
                name: "TakedownReason",
                table: "Listings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TakenDownByName",
                table: "Listings",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TakedownReason",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "TakenDownByName",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "TakenDownAt",
                table: "Listings");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RecheckRequestedAt",
                table: "Listings",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.RenameColumn(
                name: "PublishedAt",
                table: "Listings",
                newName: "ApprovedAt");

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "Listings",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ListingDecisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Areas = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DecidedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    DecidedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DecidedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    SnapshotAbout = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SnapshotCategory = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    SnapshotName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SnapshotTagline = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    Ticked = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingDecisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListingDecisions_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReviewTicks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Item = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TickedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    TickedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TickedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewTicks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReviewTicks_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ListingDecisions_ListingId_DecidedAt",
                table: "ListingDecisions",
                columns: new[] { "ListingId", "DecidedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReviewTicks_ListingId_Item",
                table: "ReviewTicks",
                columns: new[] { "ListingId", "Item" },
                unique: true);
        }
    }
}
