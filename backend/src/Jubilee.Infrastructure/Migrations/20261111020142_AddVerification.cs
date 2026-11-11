using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReadyAt",
                table: "ListingSubmissions",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReferenceConfirmedOn",
                table: "Listings",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Actor = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ActorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    TargetType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    TargetId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Before = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    After = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ListingDecisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    DecidedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DecidedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DecidedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Areas = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Ticked = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SnapshotName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SnapshotTagline = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    SnapshotCategory = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    SnapshotAbout = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReferenceDeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
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
                    ListingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Item = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    TickedBy = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TickedByName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TickedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
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
                name: "IX_AuditRecords_Actor",
                table: "AuditRecords",
                column: "Actor");

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_At",
                table: "AuditRecords",
                column: "At");

            migrationBuilder.CreateIndex(
                name: "IX_AuditRecords_TargetType_TargetId",
                table: "AuditRecords",
                columns: new[] { "TargetType", "TargetId" });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditRecords");

            migrationBuilder.DropTable(
                name: "ListingDecisions");

            migrationBuilder.DropTable(
                name: "ReviewTicks");

            migrationBuilder.DropColumn(
                name: "ReadyAt",
                table: "ListingSubmissions");

            migrationBuilder.DropColumn(
                name: "ReferenceConfirmedOn",
                table: "Listings");
        }
    }
}
