using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockAlerts_ProductId_MemberSubject",
                table: "StockAlerts");

            migrationBuilder.DropIndex(
                name: "IX_SavedItems_MemberSubject_Kind_TargetId",
                table: "SavedItems");

            migrationBuilder.DropIndex(
                name: "IX_LaunchSubscribers_EmailKey",
                table: "LaunchSubscribers");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "StockAlerts",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "SavedItems",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "RecentSearches",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "ProductPhotos",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "Notifications",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "MaintenanceWindows",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "ListingPhotos",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "LaunchSubscribers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "FeedbackScreenshots",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "Feedback",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "FeaturedSlots",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AdminDeletedAt",
                table: "BusinessPreRegistrations",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockAlerts_ProductId_MemberSubject",
                table: "StockAlerts",
                columns: new[] { "ProductId", "MemberSubject" },
                unique: true,
                filter: "[NotifiedAt] IS NULL AND [AdminDeletedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SavedItems_MemberSubject_Kind_TargetId",
                table: "SavedItems",
                columns: new[] { "MemberSubject", "Kind", "TargetId" },
                unique: true,
                filter: "[AdminDeletedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LaunchSubscribers_EmailKey",
                table: "LaunchSubscribers",
                column: "EmailKey",
                unique: true,
                filter: "[AdminDeletedAt] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StockAlerts_ProductId_MemberSubject",
                table: "StockAlerts");

            migrationBuilder.DropIndex(
                name: "IX_SavedItems_MemberSubject_Kind_TargetId",
                table: "SavedItems");

            migrationBuilder.DropIndex(
                name: "IX_LaunchSubscribers_EmailKey",
                table: "LaunchSubscribers");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "StockAlerts");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "SavedItems");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "RecentSearches");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "ProductPhotos");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "MaintenanceWindows");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "ListingPhotos");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "LaunchSubscribers");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "FeedbackScreenshots");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "Feedback");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "FeaturedSlots");

            migrationBuilder.DropColumn(
                name: "AdminDeletedAt",
                table: "BusinessPreRegistrations");

            migrationBuilder.CreateIndex(
                name: "IX_StockAlerts_ProductId_MemberSubject",
                table: "StockAlerts",
                columns: new[] { "ProductId", "MemberSubject" },
                unique: true,
                filter: "[NotifiedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SavedItems_MemberSubject_Kind_TargetId",
                table: "SavedItems",
                columns: new[] { "MemberSubject", "Kind", "TargetId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LaunchSubscribers_EmailKey",
                table: "LaunchSubscribers",
                column: "EmailKey",
                unique: true);
        }
    }
}
