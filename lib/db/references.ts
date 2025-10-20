import { getTableColumns, isNotNull, isTable, sql } from "drizzle-orm";
import { getTableConfig, pgView } from "drizzle-orm/pg-core";
import * as Schema from "./schema";

const tables = Object.values(Schema)
  .filter((t) => isTable(t))
  .flatMap((table) => {
    const config = getTableConfig(table);
    const references = config.foreignKeys.map((fk) => fk.reference());
    const cdnColumns = config.columns
      .filter((col) => {
        // Check if column references cdn.id
        const fk = references.find((fk) => fk.columns.some((c) => c === col));
        return (
          fk?.foreignTable === Schema.cdn &&
          fk?.foreignColumns?.[0] === Schema.cdn.id
        );
      })
      .map((col) => col.name);

    return cdnColumns.map((colName) => ({
      table,
      column: colName,
    }));
  });

// console.log(tables.map((t) => ({ column: t.column, table: getTableConfig(t.table).name })));

// @ts-expect-error
export const cdnReferences = pgView("cdn_references").as((qb) => {
  const queries = tables.reduce((prev, { table, column }) => {
    const cols = getTableColumns(table);
    const query = qb
      .select({
        cdn: sql<string>`${cols[column as keyof typeof cols]}`.as("cdn"),
        id: cols["id" as keyof typeof cols],
        column: sql<string>`${column}`.as("column"),
        table: sql<string>`${getTableConfig(table).name}`.as("table"),
      })
      .from(table)
      .where(isNotNull(cols[column as keyof typeof cols]));
    // @ts-expect-error
    if (prev) return prev.unionAll(query);
    return query;
  }, null);
  return queries;
});
