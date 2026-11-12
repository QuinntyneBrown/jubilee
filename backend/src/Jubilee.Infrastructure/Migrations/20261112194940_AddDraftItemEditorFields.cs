using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDraftItemEditorFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The items of the drafts already saved were services that members ask about, met by video
            // by default: the two columns that are not nullable start from those values.
            migrationBuilder.AddColumn<string>(
                name: "Action",
                table: "DraftItems",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Ask");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "DraftItems",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "DraftItems",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InPersonPlace",
                table: "DraftItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "OffersInPerson",
                table: "DraftItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "OffersVideo",
                table: "DraftItems",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "Stock",
                table: "DraftItems",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Action",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "InPersonPlace",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "OffersInPerson",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "OffersVideo",
                table: "DraftItems");

            migrationBuilder.DropColumn(
                name: "Stock",
                table: "DraftItems");
        }
    }
}
