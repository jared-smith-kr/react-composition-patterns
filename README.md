# React Composition Patterns!

React was arguably the first (and even more arguably the _last_, but that's a spicy hot take for another time) Javascript framework to truly nail the idea of _composablitily_ in web UIs. Because React has been around for over a decade at this point and seen some **substantial** architectural revisions (anybody old enough to rememeber [mixins](https://legacy.reactjs.org/blog/2016/07/13/mixins-considered-harmful.html)?) the _ways_ we compose bits of UI and functionality have changed over time and we now have a bunch of different patterns like glacier lines in a canyon wall.

This can easily confuse people, even with out shiny new thing hype around the new toys in the React toybox. So lets dive into some patterns, their tradeoffs, and when it may be appropriate to use them at Kroger (with a shout-out to some Esperanto-specific things along the way).

## Why Even Bother?

Why even bother using composition at all when we can write components like this?

```typescript
import { useEffect, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';

type JSONResponse = {
  a: number;
  b: string;
  c: Date[];
};

function MyBadComponent() {
  const [myState, setMyState] = useState<JSONResponse>();
  const [myOtherState, setMyOtherState] = useState<JSONResponse>();
  const [err, setErr] = useState<Error>();

  useEffect(() => {
    fetch('https://thething.whatever')
      .then(resp => resp.json())
      .then(json => {
        const valid = json &&
          typeof json.a === 'number' &&
          typeof json.b === 'string' &&
          Array.isArray(json.c) &&
          json.c.length &&
          'now' in json.c[0];

        if (valid) {
          setMyState(json);
        } else {
          throw new Error('bad response');
        }
      })
      .catch(setErr);
  }, []);

  const inputHandler = useCallback((evt: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    fetch('https://theotherthing.somewhere', {
      body: JSON.stringify({ userInput: evt.target.value }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
    })
      .then(resp => resp.json())
      .then(setMyOtherState)
      .catch(setErr);
  }, []);

  if (err) {
    return (<div className="error-view">{`Sorry we've had a problem: ${String(err)}`}</div>);
  } else if (myState) {
    const extraStuff = myOtherState ?
      (<div className="something">
        <div className="something-else">
          <h3>Additional Dates {myOtherState.b}: ${myOtherState.a}</h3>
          {myOtherState.c.map(dt => <div className="date-row">{dt.toLocaleDateString()} </div>)}
        </div>
      </div>)
      : (
        <label for="additional-data-inp">Additional Request</label>
        <input type="text" id="additional-data-inp" onChange={inputHandler} />
      );

    return (
      <section>
        <h2>Dates</h2>
        <div className="date-display">
          <table>
            <thead>
             <tr>
               <th>Label</th>
               <th>Date</th>
             </tr>
            </thead>
            <tbody>
               {myState.c.map(dt => (
                <tr>
                  <td>{myState.b}</td>
                  <td>{dt.toISOString()}</td>
                </tr>
               ))}
            </tbody>
          </table>
        </div>
        {extraStuff}
      </section>
    );
  } else {
    return <LoadingSpinner />;
  }
}
```

This component mixes data fetching, state management (including error and loading states), and presentation in a way that makes it hard to test, hard to debug, hard to read, etc. We can do better. The way that you fix this is to refactor: you decompose the functionality into building blocks that you then can compose together (and in different ways)! So lets talk about composition.

### Basic Composition

The most straightforward way to compose components is simply to have one render the other:

```typescript
function MyBasicComponent() {
    return <p>Hello World!</p>;
}

function MyBasicComposition() {
    return (
        <section>
          <h3>Greeting:</h3>
          <MyBasicComponent />
        </section>
    );
}
```

Class components can do the same sort of thing, but they can also use inheritance rather than composition although I bring this up mostly for the sake of dismissing it as inferior:

### Inheritance

```typescript
class MyOtherBasic extends React.Component {
    render() {
        return <p>Goodbye, cruel world!</p>;
    }
}

class MyOtherComposed extends MyOtherBasic {
    render() {
        return (
            <section>
              <h3>Farewell:</h3>
              {super.render()}
            </section>
        );
    }
}
```

Here we've called the `render` method of `super` instead of just rendering `<MyOtherBasic />` in the render method of `MyOtherComposed` which serves no real purpose but is a neat trick (NOTE: don't actually do this).

A component rendering another component is the simplest and most common method of composition in React. But this pattern sets the coupling in concrete and if over-used can create a codebase full of one-offs: even if the individual UI sections are factored better than the anti-example from the start there are severe limits to reuse and so every new use case gets a new thing. In web frontend that's especially problematic because we have to ship all that code over the wire. Additionally, this can necessitate wrapping something that isn't logically a component (like a data fetch) inside a component simply for the sake of decomposing it from a presentational component. If you've ever written Java think about about the things that aren't classes that you've had to wrap in a class because Java doesn't give you much else to work with.

Fortunately this composition pattern can be abstracted out rather than rendering a concrete component:

### Higher-Order Components

```typescript
function withGreeting<P extends {}>(Comp: React.ComponentType<P>): React.ComponentType<P> {
    return (props) => (
        <section>
          <span>Hello there, </span><Comp {...props} /><span>!</span>;
        </section>
    );
}

const GreetUser = withGreeting(({ user }: { user: string }) => (<span>User {user}</span>));
```

This is a Higher-Order Component (HOC) and should be very familiar to anyone working in Esperanto as there are a bunch of these in banner, by convention their names start with `with` and they take a component and return a different component that wraps or modifies the first one. If you are familiar with the concept of function decorators from Functional Programming you should feel very familiar with this pattern already.

That being said they've fallen somewhat out of favor in the React community and in banner web here at Kroger we recommend against making new ones. They haven't solved the "must wrap things that aren't a component in a component to get them to play nice" problem either. It turns out the cases covered by HOCs are usually better served by the basic composition pattern we started with or the next one, hooks:

### Hooks

```typescript
const useGreeting = (user: string) => (<span>User {user}</span>);

function GreetBob() {
    const nameo = useGreeting('Bob');
    return (
        <section>
          <span>Hello there, </span>{nameo}<span>!</span>
        </section>
    );
}
```

Hooks are shorter, typically easier to type in Typescript, and more flexible than HOCs because they let you abstract out things without them being full components in their own right (although they can do that too). Other than basic composition this is the pattern you should most often be reaching for, especially for things like state management and other side effects. If you find yourself reaching for `useEffect` you should _probably_ just go ahead and make a custom hook that wraps it for the intended use case.

### Context

But what if we need to abstract over something that hits large parts of the render tree and don't fit in a neat hierarchy to simply pass props and callbacks? React has us covered here:

```typescript
type User = {
    name: string;
    favoriteColor: (typeof Color)[Colors];
}

const DEFAULT_USER = { name: 'Pete Jones', favoriteColor: Color.BLUE };

const AccountDetailsContext = React.createContext(DEFAULT_USER);

function MyContextual() {
    const { name, favoriteColor } = React.useContext(AccountDetailsContext);
    return (
        <AccountDetailsContext value={{ name, favoriteColor }}>
          <span style={{ backgroundColor: favoriteColor }}>Hello {name}</span>
        </AccountDetailsContext>
    );
}
```

Well gosh, that's ugly. I don't really see any sort of win here. Note that I lifted that almost straight from the React docs. We can do better:

### Context, For Real This Time

```typescript
// We'll have a getter and a setter
const BetterAcctDetailCtxGetter = React.createContext(DEFAULT_USER);
const BetterAcctDetailCtxSetter = React.createContext((_userDetails: User) => {});

// And a provider for "seeding" the render tree
const AcctDetailProvider = ({ children }: { children: React.ReactNode }) => {
    const [userDetails, setUserDetails] = React.useState(DEFAULT_USER); // could also use useReducer here
    <BetterAcctDetailCtxGetter value={userDetails}>
      <BetterAcctDetailCtxSetter value={setUserDetails}>
        {children}
      </BetterAcctDetailCtxSetter>
    </BetterAcctDetailCtxGetter>;
};

// Custom hook for the getter/setter pair
const useAccount = () => {
    const getter = React.useContext(BetterAcctDetailCtxGetter);
    const setter = React.useContext(BetterAcctDetailCtxSetter);
    return [getter, setter];
}

// Read-only access to the value
const useAccountDetails = () => React.useContext(BetterAcctDetailCtxGetter);

// Seed the tree
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AcctDetailsProvider><App /></AcctDetailsProvider>);

// Inside components:
function SomeComponent() {
  const { name, favoriteColor } = useAccountDetails();
  // whatever
}
```

This is a pretty solid general recipe for interacting with Context. Note that you don't _have_ to put the provider at the root-level: you can place it wherever in the tree it makes sense. The bottom line here is that Context lets us compose _across_ branches and layers of the render tree rather than just in a strict hierarchy and allows us more decoupling that prop drilling.

### A Final Word About Context

Because Context is by its nature something you reach for when you need to make a common dependency available across disparate parts of the render tree be very wary of the peformance hit of triggering massive re-renders. Use memoization of things that aren't already memoized by React itself (like the setter callback from `useState`). This is especially true if you have a value that doesn't change that often depend on a value that does. For an example of that consider something like an `isMobile` flag: you're going to determine that based on viewport properties which might change frequently but there's only one breakpoint that flips the switch so be sure to memoize the value to avoid re-rendering things that only care about `isMobile` and not `width`.

## Wrapping Up

We've looked at a few patterns today:

- Basic Composition with both function and class components
- Inheritance with class components
- HOCs
- Hooks
- Context

And we can extract some heuristics about when to use each:

- Basic Composition: use this **first** and don't go beyond unless you have a good reason. Typically this is enough for most application usage, library developers will need to go deeper.
- Inheritance: **never**.
- HOCs: **Rarely**. Use-cases that deal with component composition are usually better served by basic composition and sometimes hooks, non-component composition (e.g. data fetches) are always better served by hooks.
- Hooks: **Fairly often**: if you need something beyond basic components rendering other components for composition hooks should be your go-to.
- Context: **Sparingly**. Use Context when you have a piece of information that you need to be read and/or written from lots of different and separated places in your app.

## Pachyderm

The elephant in the room is that I haven't mentioned client-side data stores like Redux or Zustand. Even though these may seem similar to the above in some ways (especially Context) they aren't really _composition_ tools per se. They aim at a different problem, albeit with some overlap.

## Resource Links

- [Recipe for Context from a Stack Overflow answer of mine](https://stackoverflow.com/questions/68850880/usecontext-not-updating-on-state-change-in-react/68851743#68851743) (NOTE: uses pre-React 19 syntax)
- [Performance considerations for Context](https://thoughtspile.github.io/2021/10/04/react-context-dangers/)
- [Repo with a working demo of all this](https://github.com/jared-smith-kr/react-composition-patterns)
- [Typescript Playground](https://www.typescriptlang.org/play/?ssl=91&ssc=1&pln=106&pc=77#code/JYWwDg9gTgLgBAJQKYEMDG8BmUIjgcilQ3wG4AocgeirgCEUBnYNczAVwDsNgJO4AsgE8GzNAGFckTkk4wAFAEo4Ab3JwNcIjHZR+AHjAA+ABJIANuYhwA6tHMATAIT6qxigF9KHbjF79hURZJcAhmPz4lVXVNbV1+eRjNTX1GJB4+IyTklIALAGYjAHEiJD9OAHMALlcCrJyc-UCmYKk+WXgqeoa4VzSMzm6NRU9KGjgASU5cpChgGBRuJHI0cyZGQSEAeRgZqCC0OCQADxhZBw3kdBgAOhDpDujkok4HWai1Hq0y+N7jIogEAcACMhEgADRwNBQdgWOAAd3szlc7myXi8KzWjA2wh2e3uYSQDiOp3OOO2u1mByesXO72Unx6cT0cESX2SqXSEUG2XZvTqADEUER4RZzDUqHVeeyVIx2GBZjcXm8oEovHyNH0uf4hjkRmjyBjxiYtuI2FwBgj5rkSkgysBKvoAAoks6vDYqDxGeT3KqIYi3AkyOQAFSECudRkUfquGDubWDMDDEadRhpGmZCTAODAjGUAF402yepyBrqGqkwItTGLrJSiJC+lXBvp7qobh3sxBcx44F1K9WXFRGM2jBQvlqy9l9Ri0HxGPBbWUAKppKBwfNW3ZL8oVeTyFRwdhruAeP2H4+zP0LuaVU8FosDwar2aqS9QDxN6uKfXUWgmQEAGsVnneBLx3B0Kg3Vl32vGBbwqB9WSfIwX3XFR30-YdR31HxLR3OgIGBD5sjnTgFzgTgUBAJBrE3cDSl3eR8EI4F8H1Z4fhZYsK36bly0aEdqzMSw6z2CFemw6sVComiIE-ITBiHRSBM1YdtUyadRj-OBJDkE4YDGWgADkthDABRP0QwAZSOTh2BADY5TQQC4GBdh4CECB2ChbzHCPNI4HaOBxLgTBoDgSk4EApAhEYcgYHDJBdIgKwoA2Td8AQcyABF8DgAAfAgtgQABBYyinM-KivwABNcyABkGq2GxqoIIpsvM4y2pYhrlyqwqCAmYycomIoth6gA1CYtga8yQzISgyIoyQ0pjdJoAcVtUugRhIRvSC003RkNGynK-XwABiAUBQABnu278HBbI6D6yyCEuh7bpup7sg68yuouz7vrux7nuSabZvmoGAHZQZ+8HNBK8rKqBm7SoAVnu37knqpqWrRm7QZxzRhtG8agYAFjoe6AA4ACZfoxRKFTgNDoJOyjqKQOCEPHTRMBQAA3aB5iQVboD9eQWdozAUrSxQAG0JfSgBdbTlvgHLzIFUrlwakMAH1l2s8yEA5rmaIup0ymSgApdpGCesLhdFs4Vb9FWble-rTwoEDyPgUq0DnLgYBysoUGAcxGD0s5Tmg2NbmhVB3b4eOFG13X9aNk2zd-PDuU2OODPYFBzBI5JNdUS2JMFkW5jTtLT0TgMbkvEvTnkYPQ7kCOFmj2P04MjjaR0bjpU1HvvL7yPB87+AhfL2F8xUQ9ZLr13G-Fnb1w8L1J5SRS4AXIRzCQVfD2BdBAIqHAuAcD2XYbsWVdPL0RKsVQN6wlTD9caeYd+5RxjgvXUM4jL0DKGcdcC8A4UToNA2YPdw5z3MOIGAxwihIPXJuJONwU4oDTvpLuWc9YG2NqbBA+pq6IJgDAlBwDo4YOONZHBrdrgEKIEQneJCFDyENu+JhMc-RoSQp6GhoE4CMLQU6HAQtgAqmggeKEuRo4OBeKec8qj1EvHWpwpOxkgTJQ8OI0iUjFZCLQXtE+K41zCMYKrDhcZLzWQWGceQZCc6UPzqQPstBQ7+XLowawl4ApIGQA4dgaBXziWyPoOhDCQ6oIHugzB2D6GviXuYFeGF7HWIPhWRJyDknCJYWwzJ65sm5LSDANCDjCk9BUGgNRjgXjqkaFQYpUAZGpPKTg3Urhum9JASwjJMCxyGgoNXS8gC5DKLMVXKRFR2F4Lbh3YeXdhmlLQWMnBo8NDV1qTA5xtwNl8PkNsjAZTMEVJgQc7449+CKxWZU-aOD1aGngWBNIcyUkgIyqyJC+DzkZ0uTgkZzD0n7IoEAA)
