# GenUI Schema v1.0

Shared TypeScript type definitions for GenUI read-only UI generation schema.

## Overview

This package defines the language of GenUI, not its execution. It provides type-safe definitions for:

- Component types (Column, Row, Card, Divider, Text, Icon, Image)
- Message types (surfaceUpdate, dataModelUpdate, beginRendering)
- Data binding via JSON pointers
- Layout and typography enums

## Installation

```bash
npm install ./genui-schema
```

## Usage

```typescript
import type { GenUIMessage, Component, SurfaceUpdate } from "genui-schema";

// Type-safe message handling
function handleMessage(message: GenUIMessage) {
  if (message.type === "surfaceUpdate") {
    // message.components is typed
  }
}
```

## Schema Principles

- **Read-only UI**: No inputs, buttons, actions, or events
- **Visual & informational only**: Browsing and visualization
- **Declarative structure**: Components defined as flat list
- **Separation of concerns**: UI structure separate from data
- **Data binding**: JSON pointers reference nested data model

## Package Structure

- `src/enums.ts` - Layout and typography enums
- `src/binding.ts` - Data binding types (JSON pointers)
- `src/components.ts` - Component type definitions
- `src/messages.ts` - Message type definitions
- `src/index.ts` - Public API exports

## License

MIT
