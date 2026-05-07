---
id: "typescript-senior-variance"
slug: "what-is-variance"
question: "What is variance in TypeScript?"
language: "typescript"
level: "senior"
tags: ["types", "variance"]
createdAt: "2026-02-15"
updatedAt: "2026-02-15"
---

**Variance** describes how subtyping between complex types relates to subtyping between their components. TypeScript supports covariance, contravariance, and bivariance depending on position.

```ts
type Co<T> = () => T;     // covariant
type Contra<T> = (x: T) => void; // contravariant
```
