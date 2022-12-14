import { TSMigrationGenerator } from "@mikro-orm/migrations";
import prettier from "prettier";
import { format, FormatOptionsWithLanguage } from "sql-formatter";

export class MigrationGenerator extends TSMigrationGenerator {
  createStatement(sql: string, padLeft: number): string {
    const padding = " ".repeat(padLeft);

    const driverType = this.driver.config.get("type");

    let language: FormatOptionsWithLanguage["language"] = "postgresql";

    switch (driverType) {
      case "mysql":
        language = "mysql";
        break;
      case "mariadb":
        language = "mariadb";
        break;
      case "postgresql":
        language = "postgresql";
        break;
      default:
    }

    const formatSql = format(sql, { language }).replace(/['\\]/g, "\\'");

    return `${padding}this.addSql(/* SQL */ \`
      ${formatSql.replace(/\n/g, `\n${padding}  `)}
    \`);\n\n`;
  }

  generateMigrationFile(
    className: string,
    diff: { up: string[]; down: string[] }
  ): string {
    return `/* eslint-disable */\n\n${prettier.format(
      super.generateMigrationFile(className, diff),
      {
        parser: "typescript",
      }
    )}`;
  }
}
