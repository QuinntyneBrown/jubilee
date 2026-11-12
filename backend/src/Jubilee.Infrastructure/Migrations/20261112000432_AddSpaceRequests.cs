using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSpaceRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "CheckIn",
                table: "Requests",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "CheckOut",
                table: "Requests",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "MoveIn",
                table: "Requests",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpaceTerm",
                table: "Requests",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StayMonths",
                table: "Requests",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckIn",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "CheckOut",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "MoveIn",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "SpaceTerm",
                table: "Requests");

            migrationBuilder.DropColumn(
                name: "StayMonths",
                table: "Requests");
        }
    }
}
