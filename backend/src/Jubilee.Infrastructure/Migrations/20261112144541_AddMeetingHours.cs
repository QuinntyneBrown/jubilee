using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeOnly>(
                name: "MeetingClosesAt",
                table: "Listings",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "MeetingOpensAt",
                table: "Listings",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MeetingSlotMinutes",
                table: "Listings",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MeetingClosesAt",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "MeetingOpensAt",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "MeetingSlotMinutes",
                table: "Listings");
        }
    }
}
