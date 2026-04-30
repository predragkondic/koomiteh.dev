---
id: "javascript-junior-hoisting"
slug: "what-is-hoisting"
question: "What is hoisting in JavaScript?"
language: "javascript"
level: "junior"
tags: ["hoisting", "scope", "var"]
createdAt: "2026-04-29"
updatedAt: "2026-04-29"
---

**Hoisting** moves declarations to the top of their scope at parse time. `var` declarations are hoisted and initialised to `undefined`; `let` / `const` are hoisted but live in the *temporal dead zone* until their declaration line.

```js
console.log(a); // undefined
var a = 1;

console.log(b); // ReferenceError
let b = 2;
```

Function declarations are hoisted *with* their body, function expressions are not.
