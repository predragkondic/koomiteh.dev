---
id: "typescript-senior-variance"
slug: "function-parameter-variance"
question: "How does TypeScript handle function parameter variance?"
language: "typescript"
level: "senior"
tags: ["variance", "types", "functions"]
createdAt: "2026-04-29"
updatedAt: "2026-04-29"
---

By default TypeScript treats function parameters **bivariantly** (an unsound but ergonomic legacy default). With `strictFunctionTypes` enabled, parameters become **contravariant** — a function type with a wider parameter is assignable to one with a narrower parameter, not the reverse.

```ts
type Animal = { name: string };
type Dog = Animal & { bark(): void };

let f: (a: Animal) => void = (a) => console.log(a.name);
let g: (d: Dog) => void = f; // OK: contravariance
```

Methods on object types remain bivariant even under `strictFunctionTypes` — a deliberate escape hatch for built-ins like `Array.prototype.push`.
