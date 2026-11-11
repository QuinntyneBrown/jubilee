using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NotificationEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RemindedAt",
                table: "Requests",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "OutboxMessages",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailMessages",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailNewBusinesses",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EmailReminders",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailRequests",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailTips",
                table: "Members",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RemindedAt",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "OutboxMessages");

            migrationBuilder.DropColumn(
                name: "EmailMessages",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "EmailNewBusinesses",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "EmailReminders",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "EmailRequests",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "EmailTips",
                table: "Members");
        }
    }
}
