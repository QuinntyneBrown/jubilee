using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatementLapse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StatementLapsedAt",
                table: "Listings",
                type: "datetimeoffset",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StatementLapsedAt",
                table: "Listings");
        }
    }
}
