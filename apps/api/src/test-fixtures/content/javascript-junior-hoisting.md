---
id: "javascript-junior-hoisting"
slug: "what-is-hoisting"
question: "What is hoisting?"
language: "javascript"
level: "junior"
tags: ["hoisting", "scope"]
createdAt: "2026-03-20"
updatedAt: "2026-03-20"
---

**Hoisting** is JavaScript's behavior of moving variable and function declarations to the top of their scope before code execution. `let` and `const` are hoisted but live in the temporal dead zone.

```js
console.log(typeof foo); // 'function'
function foo() {}
```
