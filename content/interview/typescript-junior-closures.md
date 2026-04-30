---
id: "typescript-junior-closures"
slug: "what-is-a-closure"
question: "What is a closure?"
language: "typescript"
level: "junior"
tags: ["closures", "scope"]
createdAt: "2026-04-29"
updatedAt: "2026-04-29"
---

A **closure** is a function bundled with references to its surrounding lexical scope. The inner function keeps access to outer variables even after the outer function has returned.

```ts
function makeCounter(): () => number {
  let count = 0;
  return () => ++count;
}

const next = makeCounter();
next(); // 1
next(); // 2
```

`count` lives on because `next` closes over it.
