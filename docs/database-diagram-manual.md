# Database Diagram User Guide

The interactive database diagram provides a visual representation of your database schema, making it easy to understand table relationships and explore your data structure.

## Overview

The database diagram displays tables, views, and their relationships in an interactive ERD-style format. Relationships are drawn as orthogonal (right-angle) connectors with crow's-foot markers indicating cardinality, anchored to the specific columns involved (FK column → referenced PK/UK column).

## Understanding the Diagram Elements

### Tables and Views

- **Tables**: Rectangular boxes with table name and columns
- **Views**: Similar to tables, shown with an icon and italic styling
- **Primary Keys**: 🔑 icon, highlighted in teal blue
- **Foreign Keys**: 🔗 icon, highlighted in orange

### Relationships

Lines connect related tables with different styles:

- **Teal Blue Lines**: Foreign key relationships between tables
- **Orange Lines**: Many-to-many relationships through junction tables
- **Gray Dashed Lines**: View dependencies

Markers indicate cardinality:
- **Crow's Foot**: "Many" side of a relationship
- **Double Bar** (||): "One" side (e.g., FK → PK/UK)

## Interacting with the Diagram

### Navigation

- **Pan**: Drag the background to move around
- **Zoom**: Use controls in top right or mouse wheel/trackpad
- **Move Tables**: Click and drag any table to reposition

### Selection and Highlighting

Click on a table to select it:
- Selected table: Teal/cyan theme (tinted background + border)
- Related tables: Orange theme (tinted background + border)
- Relationship lines: Emphasized
- Participating fields: Highlighted (FK/PK columns)
- Unrelated elements: Dimmed
- Click empty space to deselect

## Controls Panel

The controls panel in the top right provides zoom (`+` / `-`), auto layout (✨), export, and layout sliders.

**Auto layout (✨)**: Recomputes layout parameters and recenters the diagram. Use this as your "reset" button.

### Layout Controls (Force-Directed)

The diagram uses a force-directed layout. Adjust it using the sliders:

- **Collision Radius**: Prevents overlap by enforcing spacing between tables
  - Increase first if tables overlap or feel cramped
  - Rule of thumb: roughly "half the node diagonal + padding"
- **Link Distance**: Controls the preferred length of connections between tables
  - Increase for more spread out tables
  - Decrease for more compact layout
- **Charge Strength** (negative): Controls how strongly tables repel each other
  - More negative values push tables further apart
  - Less negative values allow tables to be closer together
  - More negative is usually needed for larger/denser schemas

Suggested tuning order:
1. Set **Collision Radius** to eliminate overlap
2. Adjust **Link Distance** for readability vs. whitespace
3. Adjust **Charge Strength** to reduce clumping (more negative) or tighten layout (less negative)

## Understanding Database Relationships

### One-to-Many
One record references many records. Example: One `customer` → many `orders`.
- "One" side: Vertical bar (|)
- "Many" side: Crow's foot (<--)

### Many-to-Many
Multiple records reference multiple records via a junction table. Example: Many `films` ↔ many `actors` through `film_actor`.
- Orange lines indicate this relationship
- Junction tables typically have composite primary keys and multiple foreign keys

## Troubleshooting

| Issue                                         | Solution                                                    |
| --------------------------------------------- | ----------------------------------------------------------- |
| Diagram is too cluttered                      | Increase Link Distance and Charge Strength                  |
| Tables are too spread out                     | Decrease Link Distance and Charge Strength                  |
| Tables overlap                                | Increase Collision Radius                                   |
| Need to focus on specific relationships       | Click on a table to highlight its relationships             |
| Can't see whole diagram or layout looks messy | Click **Auto layout (✨)**, then fine-tune sliders if needed |
