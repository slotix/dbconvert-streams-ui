# Database Diagram User Guide

The interactive database diagram provides a visual representation of your database schema, making it easy to understand table relationships and explore your data structure.

## Overview

The database diagram displays tables, views, and their relationships in an intuitive, interactive format. Tables are represented as boxes containing column information, while relationships between tables are shown as connecting lines with crow's foot notation indicating the relationship type.

![Database Diagram Overview](diagram-overview.png)

## Understanding the Diagram Elements

### Tables and Views

- **Tables**: Rectangular boxes displaying table name and columns
- **Views**: Similar to tables but with a slightly different header shade
- **Primary Keys**: Indicated with a 🔑 icon and highlighted in teal blue
- **Foreign Keys**: Indicated with a 🔗 icon and highlighted in orange

### Relationship Lines

The diagram uses standard Entity-Relationship Diagram (ERD) notation with crow's foot symbols:

- **Teal Blue Lines**: Regular foreign key relationships between tables
- **Orange Lines**: Relationships through junction tables (many-to-many)
- **Gray Dashed Lines**: View dependencies

### Relationship Markers

The diagram uses the following notation at the end of relationship lines:

- **Crow's Foot** (<--): Represents the "many" side of a relationship (looks like branching lines)
- **Vertical Bar** (|): Represents the "one" side of a relationship
- **Double Vertical Bar** (||): Represents the "one" side with a stronger constraint

## Interacting with the Diagram

### Navigation

- **Pan**: Click and drag on empty space to move around the diagram
- **Zoom**: Use the zoom controls in the top right, or use mouse wheel/trackpad
  - Click the `+` button to zoom in
  - Click the `-` button to zoom out
  - Current zoom level is displayed as a percentage
  - Click the reset button (↻) to return to the original view

### Table Interaction

- **Move Tables**: Click and drag any table to reposition it
- **Select Table**: Click on a table to select it
  - Selected tables are highlighted with a teal blue border
  - Related tables are highlighted with an orange border
  - Related fields are also highlighted
- **Deselect**: Click on empty space to deselect all tables

### Relationship Highlighting

When you select a table:
1. All directly connected tables are highlighted
2. The relationship lines connecting these tables are emphasized
3. Fields participating in the relationships are highlighted
4. Unrelated tables and relationships are dimmed

### Hover Information

- **Field Relationships**: Hover over a highlighted field to see its relationships
- **Relationship Lines**: Hover over a line to see details about the relationship

## Controls Panel

The controls panel in the top right corner provides tools to customize the diagram:

### Zoom Controls

- **Zoom In**: Increase the diagram size
- **Zoom Out**: Decrease the diagram size
- **Zoom Level**: Shows the current zoom percentage
- **Reset View**: Return to the original view and zoom level

### Force Layout Controls

The diagram uses a force-directed layout that can be adjusted using the slate-gray sliders:

- **Link Distance**: Controls the length of connections between tables
  - Increase for more spread out tables
  - Decrease for more compact layout
- **Charge Strength**: Controls how strongly tables repel each other
  - More negative values push tables further apart
  - Less negative values allow tables to be closer together
- **Collision Radius**: Controls minimum distance between tables
  - Larger values prevent tables from overlapping
  - Smaller values allow tighter packing

## Understanding Database Relationships

### One-to-Many Relationships

The most common relationship type, where one record in the first table can be referenced by multiple records in the second table.

Example: One `customer` can have many `orders`.

- The "one" side shows a vertical bar (|)
- The "many" side shows a crow's foot (<--)

### Many-to-Many Relationships

Relationships where records in both tables can reference multiple records in each other, implemented using a junction table.

Example: Many `films` can have many `actors` through the `film_actor` junction table.

- Both tables connect to a junction table
- Orange lines indicate a many-to-many relationship

### Junction Tables

Tables that connect two other tables in a many-to-many relationship.

Identifying characteristics:
- Usually has a composite primary key
- Contains at least two foreign keys
- Often named as a combination of the two tables it connects

## Best Practices

1. **Adjust Layout**: Use the slider controls to find the optimal layout for your schema
2. **Focus on Subsets**: Select specific tables to focus on particular relationships
3. **Arrange Related Tables**: Position related tables close to each other for clarity
4. **Explore Dependencies**: Select views to understand their dependencies on base tables

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Diagram is too cluttered | Increase Link Distance and Charge Strength |
| Tables are too spread out | Decrease Link Distance and Charge Strength |
| Tables overlap | Increase Collision Radius |
| Need to focus on specific relationships | Click on a table to highlight its relationships |
| Can't see the whole diagram | Click the reset view button or zoom out |
| Lost the original view | Click the reset view button to return to the starting position |

---

The database diagram is a powerful tool for understanding your database structure. Use it to explore relationships, plan changes, and document your database schema. 