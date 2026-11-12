using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Jubilee.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStatementAgreements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StatementAgreements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerSubject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Version = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AgreedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatementAgreements", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StatementAgreements_OwnerSubject_Version",
                table: "StatementAgreements",
                columns: new[] { "OwnerSubject", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StatementAgreements");
        }
    }
}
