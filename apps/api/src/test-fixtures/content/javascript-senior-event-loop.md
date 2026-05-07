---
id: "javascript-senior-event-loop"
slug: "explain-the-event-loop"
question: "Explain the JavaScript event loop and microtasks."
language: "javascript"
level: "senior"
tags: ["async", "event-loop"]
createdAt: "2026-04-05"
updatedAt: "2026-04-05"
---

The **event loop** processes one macrotask, then drains all microtasks before the next macrotask. Promises and `queueMicrotask` schedule microtasks; `setTimeout` schedules macrotasks.

```js
Promise.resolve().then(() => console.log('micro'));
setTimeout(() => console.log('macro'));
console.log('sync');
// sync, micro, macro
```
