using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DataExportArchiveKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // An archive kept in the column moves nowhere: its export expires and the member can ask again (ADR 0069).
            migrationBuilder.Sql("UPDATE DataExports SET Status = 'Expired', TokenHash = NULL WHERE Status = 'Ready'");

            migrationBuilder.DropColumn(
                name: "ArchiveJson",
                table: "DataExports");

            migrationBuilder.AddColumn<string>(
                name: "ArchiveKey",
                table: "DataExports",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArchiveKey",
                table: "DataExports");

            migrationBuilder.AddColumn<string>(
                name: "ArchiveJson",
                table: "DataExports",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
