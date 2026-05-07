---
id: "typescript-junior-closures"
slug: "what-is-a-closure"
question: "What is a closure?"
language: "typescript"
level: "junior"
tags: ["closures", "scope"]
createdAt: "2026-01-10"
updatedAt: "2026-01-10"
---

A **closure** is a function bundled with references to its surrounding lexical scope. The inner function keeps access to outer variables.

```ts
function makeCounter(): () => number {
  let count = 0;
  return () => ++count;
}
```
