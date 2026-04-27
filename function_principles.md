# Function Principles: Single Responsibility

Functions are the building blocks of most programs, and adhering to certain principles can greatly improve code clarity, maintainability, and testability. One such principle, closely related to the Single Responsibility Principle (SRP), suggests that a function should primarily focus on one of three distinct actions:

1.  **Transform a Value (Pure Functions):**
    *   These functions take one or more inputs and return a new output based solely on those inputs, without causing any observable side-effects.
    *   They are deterministic: given the same inputs, they will always produce the same output.
    *   Examples: `add(a, b)`, `formatDate(date)`, `calculateTax(price, rate)`.
    *   Benefits: Easy to test, reason about, and parallelize.

2.  **Perform a _Single_ Side-Effect:**
    *   Make something happen in the outside world. The email is sent, or the database is updated, or the missles are launched, etc.
    *   They might not return a value (or return `this` for fluent interfaces).
    *   Examples: `saveUserToDatabase(user)`, `logMessage(message)`, `renderUI(data)`, `makeHttpRequest(url, data)`.
    *   Benefits: Encapsulates interactions with external systems, making it clear where state changes or external calls occur.

3.  **Play Air Traffic Controller (Dispatch/Orchestrate):**
    *   These functions coordinate calls to other functions, often acting as a higher-level orchestrator. They might combine transformation and side-effect functions to achieve a larger goal.
    *   They typically contain control flow logic (e.g., `if/else`, loops) and delegate specific tasks to other, more specialized functions.
    *   Examples: `processOrder(orderData)` (which might call `validateOrder`, `calculateTotal`, `saveOrder`, `sendConfirmationEmail`).
    *   Benefits: Provides a clear flow of operations, improving readability and separating concerns at a higher level.

### Violating the Principle: An Anti-Pattern Example

Consider a function like this:

```typescript
async function processAndNotifyUser(userData: User): Promise<string> {
    const formattedUser = { ...userData, name: userData.firstName + ' ' + userData.lastName.toUpperCase() };
    const resp = await post(userCreationEndpoint, user);
    const id = await resp.text();
    formattedUser.id = id;
    const welcome = `Welcome ${formattedUser.name}!, your account has been created.");
    await email.send(formattedUser.email, welcome);
    return id;
}
```

This `processAndNotifyUser` function attempts to do too much. It combines:
*   **Transformation:** Formatting `userData` and generating a confirmation message.
*   **Side-effects:** Saving to a database and sending an email.

This violation leads to several problems:
*   **Reduced Testability:** Testing this function requires setting up mocks for both database operations and email sending, even if you only want to test the data formatting or the returned message.
*   **Lower Reusability:** The specific combination of saving and emailing might not be needed in every scenario where a user needs processing.
*   **Increased Complexity & Maintainability:** If the logic for saving a user changes, or the email content needs modification, this single function needs to be updated. This increases the risk of introducing bugs in unrelated parts of the function's responsibilities.
*   **Poor Readability:** The function's name hints at multiple actions, and its body confirms it, making it harder to quickly grasp its exact purpose.

A better approach would be to break this down into smaller, focused functions, potentially orchestrated by a dispatcher:

```typescript
// Pure function (Transforms value)
function formatUserName(user: User): User {
    return { ...user, name: user.firstName + ' ' + user.lastName.toUpperCase() };
}

// Side-effect function
async function saveUserToDatabase(user: User): Promise<void> {
    // ... database logic ...
}

// Side-effect function
async function sendWelcomeEmail(email: string, userName: string): Promise<void> {
    // ... email sending logic ...
}

// Dispatch/Orchestration function
function registerNewUser(userData: User): string {
    const formattedUser = formatUserName(userData);
    saveUserToDatabase(formattedUser);
    sendWelcomeEmail(formattedUser.email, formattedUser.name);
    return `User ${formattedUser.name} registered successfully.`;
}
```

The side-effective and value-transforming functions can be independently tested, and then the `registerNewUser` orchestration function can, if necessary, mock out alldependencies and test only that the correct functions are called. But I frequently forgo testing dispatchers entirely at the unit test level.

### Composition Patterns

Once you have a suite of single-purpose functions, you can use more advanced composition patterns to combine them in flexible and reusable ways. **Function decorators** (or higher-order functions that wrap other functions) are a great example of this.

A decorator can add a "cross-cutting" concern (like logging, timing, or error handling) to a function without modifying the function itself. This keeps the core function focused on its primary responsibility.

Lets add logging to our user-saving function:

```typescript
async function saveUserToDatabase(user: User): Promise<User> {
    console.log(`Saving user ${JSON.stringify(user)}`);
    const resp = await axios.post(userCreationEndpoint, user);
    const id = await resp.text();
    console.log(`User successfully created with id ${String(id)}`);
    return {
        ...user,
        id
    };
}
```

Ugh. We are now performing 3 side-effects instead of 1. Even worse, if we want to add similar logging to the function
that sends the welcome email we have to copy/pasta and pretty soon all of our actual logic is obscured by logging
statements. But this is Javascript, so we can do better:

```typescript
// Decorator (a higher-order function)
function withLogging<F extends (...args: any[]) => Promise<any>>(fn: F) {
    return async function(...args: Parameters<F>): ReturnType<F> {
        console.log(`Calling ${fn.name} with arguments: ${JSON.stringify(args)}`);
        const result = await fn(...args);
        console.log(`${fn.name} has finished with result ${JSON.stringify(result)}.`);
        return result;
    };
}

// Now, we can create decorated versions of our functions:
const saveUserWithLogging = withLogging(saveUserToDatabase, 'saveUserToDatabase');
const sendEmailWithLogging = withLogging(sendWelcomeEmail, 'sendWelcomeEmail');

// The dispatcher can now use the decorated functions
function registerNewUserWithLogging(userData: User): string {
    const formattedUser = formatUserName(userData);
    saveUserWithLogging(formattedUser);
    sendEmailWithLogging(formattedUser.email);
    return `User ${formattedUser.name} registered successfully.`;
}
```

By using decorators, we have:
*   **Kept Functions Pure:** `saveUserToDatabase` and `sendWelcomeEmail` remain clean and focused on their specific side-effects.
*   **Centralized Cross-Cutting Logic:** All logging logic is contained within the `withLogging` decorator. If we want to change how we log, we only need to update it in one place.
*   **Promoted Reusability:** The `withLogging` decorator can be applied to any function, not just our user-related ones.
*   **Improved Declarative Style:** We are declaring *that* we want logging, rather than imperatively writing the logging code inside every function.

### React

All of this applies to React Functional Components. Don't mix presentation with business logic or dispatch plumbing.
