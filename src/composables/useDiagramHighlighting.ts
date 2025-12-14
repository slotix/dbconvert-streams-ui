import { ref } from 'vue'
import type { Table } from '@/types/schema'
import type { TableLink, RelatedField } from '@/types/diagram'

export function useDiagramHighlighting() {
  const selectedTable = ref<string | null>(null)

  /**
   * Find tables that are directly related to the given table via links
   */
  function findRelatedTables(tableName: string, links: TableLink[]): Set<string> {
    const related = new Set<string>()

    links.forEach((link: TableLink) => {
      const source = typeof link.source === 'string' ? link.source : link.source.id
      const target = typeof link.target === 'string' ? link.target : link.target.id

      if (source === tableName) {
        related.add(target)
      } else if (target === tableName) {
        related.add(source)
      }
    })

    return related
  }

  /**
   * Find related fields and their relationships for a given table
   */
  function findRelatedFields(
    tableName: string,
    tables: Table[]
  ): {
    fields: Set<string>
    relationships: RelatedField[]
  } {
    const fields = new Set<string>()
    const relationships: RelatedField[] = []

    // Get foreign key relationships for the selected table
    const table = tables.find((t) => t.name === tableName)
    if (table?.foreignKeys) {
      table.foreignKeys.forEach((fk) => {
        fields.add(fk.sourceColumn)
        fields.add(fk.referencedColumn)
        relationships.push({
          tableName: tableName,
          fieldName: fk.sourceColumn,
          relatedTableName: fk.referencedTable,
          relatedFieldName: fk.referencedColumn
        })
      })
    }

    // Get foreign keys pointing to this table
    tables.forEach((t) => {
      t.foreignKeys?.forEach((fk) => {
        if (fk.referencedTable === tableName) {
          fields.add(fk.sourceColumn)
          fields.add(fk.referencedColumn)
          relationships.push({
            tableName: t.name,
            fieldName: fk.sourceColumn,
            relatedTableName: tableName,
            relatedFieldName: fk.referencedColumn
          })
        }
      })
    })

    return { fields, relationships }
  }

  /**
   * Toggle selection of a table
   */
  function toggleSelection(tableName: string) {
    selectedTable.value = selectedTable.value === tableName ? null : tableName
  }

  /**
   * Clear the current selection
   */
  function clearSelection() {
    selectedTable.value = null
  }

  /**
   * Check if a table is the currently selected one
   */
  function isSelected(tableName: string): boolean {
    return selectedTable.value === tableName
  }

  /**
   * Check if a table is related to the currently selected table
   */
  function isRelated(tableName: string, links: TableLink[]): boolean {
    if (!selectedTable.value) return false
    const related = findRelatedTables(selectedTable.value, links)
    return related.has(tableName)
  }

  return {
    // State
    selectedTable,

    // Methods
    findRelatedTables,
    findRelatedFields,
    toggleSelection,
    clearSelection,
    isSelected,
    isRelated
  }
}
